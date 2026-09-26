import type { Direction, FloorGrid, GridCell, TombKeyReward } from "./siteTypes"
import type { LockSpec, Mechanism, GateId, RegionId } from "./lockWalk"
import { nodeBeyond } from "./siteValidator"

type Pos = readonly [number, number]
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const posKey = (r: number, c: number) => `${r},${c}`

const walkable = (cell: GridCell | undefined): boolean =>
  !!cell && (cell.type === "room" || cell.type === "corridor") && !cell.hidden

/** A door: a room the player may not walk into without satisfying the key it names. */
const doorKeyOf = (cell: GridCell | undefined): string | undefined =>
  cell?.type === "room" ? cell.requiredKeyId : undefined

const dirsOf = (cell: GridCell): ReadonlySet<Direction> =>
  cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set<Direction>()

// A FLOOR READ AS A LOCK. Doors come out as regions of their own, each joined by one gate to every
// region it touches — which is what lets a door standing in a three-way junction be three gates onto
// one small region instead of a gate that joins three places at once. Everything else walkable falls
// into the components the doors leave behind.
//
// ponytail: the flood treats a passage as walkable from both sides, which is true of every floor the
// world carves today. One-ways arrive with the directed-edge primitive, and regions then want the
// strongly connected components rather than these.
//
// Hidden cells are left out: a hidden section is never a statement that the player found it, so a
// floor has to be sound without one.
const regionsOf = (grid: FloorGrid): { ids: RegionId[]; of: Map<string, RegionId> } => {
  const of = new Map<string, RegionId>()
  const ids: RegionId[] = []

  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (!walkable(cell) || of.has(posKey(r, c))) continue
      const isDoor = doorKeyOf(cell) !== undefined
      const id = isDoor ? `door ${r},${c}` : `at ${r},${c}`
      ids.push(id)
      const queue: Pos[] = [[r, c]]
      of.set(posKey(r, c), id)
      // A door is a region of exactly one cell; everything else floods.
      while (!isDoor && queue.length > 0) {
        const [qr, qc] = queue.shift()!
        const from = grid.cells[qr][qc]
        for (const dir of dirsOf(from)) {
          const [dr, dc] = MOVES[dir]
          const [nr, nc] = [qr + dr, qc + dc]
          const next = grid.cells[nr]?.[nc]
          if (!walkable(next) || doorKeyOf(next) !== undefined || of.has(posKey(nr, nc))) continue
          of.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }

  return { ids, of }
}

export const floorLock = (grid: FloorGrid): LockSpec | undefined => {
  // Every way out a switch closed, by the door it stands in front of. A switch names its gates on its
  // own exits, which is the one place the floor writes down which door belongs to which board.
  const doorsBySwitch = new Map<string, Pos[]>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const door = nodeBeyond(grid, [r, c], exit.dir)
        if (!door) continue
        doorsBySwitch.set(posKey(r, c), [...(doorsBySwitch.get(posKey(r, c)) ?? []), door])
      }
    }
  if (doorsBySwitch.size === 0) return undefined

  const { ids, of } = regionsOf(grid)
  const gates: LockSpec["gates"] = {}
  const mechanisms: Record<string, Mechanism> = {}
  /** Which gates a door's key id ended up owning — a door may be three gates. */
  const gatesByKeyId = new Map<string, GateId[]>()

  // Each door is joined to every region it touches. The owner is filled in below; a gate with no owner
  // is rejected by the walk, so every door has to be accounted for.
  const ownerOf = new Map<string, string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      const keyId = doorKeyOf(cell)
      if (keyId === undefined || !walkable(cell)) continue
      const doorRegion = of.get(posKey(r, c))!
      for (const dir of dirsOf(cell)) {
        const [dr, dc] = MOVES[dir]
        const beside = of.get(posKey(r + dr, c + dc))
        if (!beside || beside === doorRegion) continue
        const gateId = `${keyId}|${beside}`
        gates[gateId] = { from: beside, to: doorRegion, owners: [] }
        gatesByKeyId.set(keyId, [...(gatesByKeyId.get(keyId) ?? []), gateId])
      }
    }

  // A switch: unset until it is solved, then one state per way out, and re-solvable from any state
  // into any other — which is what lets a player change their mind, and the only reason the doors it
  // shut are not a trap.
  for (const [switchPos, doors] of doorsBySwitch) {
    const id = `switch ${switchPos}`
    const byDoor = doors.map(([dr, dc]) => gatesByKeyId.get(doorKeyOf(grid.cells[dr][dc])!) ?? [])
    const states = ["unset", ...doors.map(([dr, dc]) => `open ${dr},${dc}`)]
    const opens: Record<string, GateId[]> = { unset: [] }
    states.slice(1).forEach((state, n) => (opens[state] = byDoor[n]))
    mechanisms[id] = {
      states,
      initial: "unset",
      opens,
      transitions: states.flatMap(from =>
        states.filter(to => to !== from).map(to => ({ from, to, at: of.get(switchPos)! }))
      ),
    }
    for (const gateIds of byDoor) for (const gateId of gateIds) ownerOf.set(gateId, id)
  }

  // A floor key: found once, held for good. The chest that mints it is a room on this floor, so the
  // move is throwing it in whichever region holds that room.
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || cell.reward?.type !== "tombKey") continue
      const keyId = (cell.reward as TombKeyReward).keyId
      const gateIds = gatesByKeyId.get(keyId)
      if (!gateIds || !of.has(posKey(r, c))) continue
      const id = `key ${keyId}`
      mechanisms[id] = {
        states: ["absent", "held"],
        initial: "absent",
        opens: { absent: [], held: gateIds },
        transitions: [{ from: "absent", to: "held", at: of.get(posKey(r, c))! }],
      }
      for (const gateId of gateIds) ownerOf.set(gateId, id)
    }

  // WHAT IS LEFT IS SEALED. A ward gate opens on progress made elsewhere in the world, and a lock that
  // leaned on one could only ever be checked in context — so it is assumed shut, which is the reading
  // that keeps the answer local. A door whose opener this floor does not hold reads the same way.
  for (const gateId of Object.keys(gates)) {
    if (ownerOf.has(gateId)) continue
    const id = `sealed ${gateId.split("|")[0]}`
    mechanisms[id] ??= { states: ["shut"], initial: "shut", opens: { shut: [] }, transitions: [] }
    ownerOf.set(gateId, id)
  }
  for (const [gateId, gate] of Object.entries(gates)) gate.owners = [ownerOf.get(gateId)!]

  return {
    regions: ids,
    gates,
    mechanisms,
    in: of.get(posKey(grid.entrancePos[0], grid.entrancePos[1]))!,
    out: of.get(posKey(grid.exitPos[0], grid.exitPos[1]))!,
  }
}
