import type { Direction, FloorGrid, GridCell, TombKeyReward } from "./siteTypes"
import type { LockSpec, Mechanism, GateId, MechanismId, RegionId } from "./lockWalk"
import { nodeBeyond } from "./siteValidator"

type Pos = readonly [number, number]
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const posKey = (r: number, c: number) => `${r},${c}`

const walkable = (cell: GridCell | undefined): boolean =>
  !!cell && (cell.type === "room" || cell.type === "corridor") && !cell.hidden

// A DOOR IS A ROOM THE PLAYER MAY NOT WALK INTO WITHOUT SATISFYING EVERY KEY IT NAMES, and it may
// name several: a tableau standing in the way asks for one id per hieroglyph (`requiredKeyIds`), and
// the game's own walk (siteValidator's `reachableFrom`) refuses the step on any one of them exactly
// as it refuses a single `requiredKeyId`. A barrier this compiler cannot model has to come out shut,
// so every id counts — a boundary stands open only while all of them do.
const doorKeysOf = (cell: GridCell | undefined): string[] =>
  cell?.type === "room" ? [...(cell.requiredKeyId ? [cell.requiredKeyId] : []), ...(cell.requiredKeyIds ?? [])] : []

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
      const isDoor = doorKeysOf(cell).length > 0
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
          if (!walkable(next) || doorKeysOf(next).length > 0 || of.has(posKey(nr, nc))) continue
          of.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }

  return { ids, of }
}

// A PASSAGE THE PLAYER MAY TAKE ONLY ONE WAY. The region flood follows each cell's own dirs, so the
// ground past a drop is already a region of its own; without this the walk would believe nothing
// reaches it and would refuse a floor that is perfectly sound. A pair whose two cells fall in the
// same region is skipped: inside a region the player walks freely, so a drop between two of its own
// cells is not a move the walk needs told about.
const oneWaysOf = (grid: FloorGrid, of: Map<string, RegionId>): { from: RegionId; to: RegionId }[] => {
  const found: { from: RegionId; to: RegionId }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      const fromRegion = of.get(posKey(r, c))
      if (!fromRegion) continue
      for (const dir of dirsOf(cell)) {
        const [dr, dc] = MOVES[dir]
        const [nr, nc] = [r + dr, c + dc]
        const next = grid.cells[nr]?.[nc]
        const toRegion = of.get(posKey(nr, nc))
        if (!toRegion || toRegion === fromRegion) continue
        if (!next || !dirsOf(next).has(OPPOSITE[dir])) found.push({ from: fromRegion, to: toRegion })
      }
    }
  return found
}

/** One door's gates for one of the keys it names — the index a switch reads its own doors back out of. */
const doorKey = (doorRegion: RegionId, keyId: string) => `${doorRegion}|${keyId}`

export const floorLock = (grid: FloorGrid): LockSpec | undefined => {
  // Every way out a switch closed, by the door it stands in front of. A switch names its gates on its
  // own exits, which is the one place the floor writes down which door belongs to which board.
  const doorsBySwitch = new Map<string, { at: Pos; keyId: string }[]>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const door = nodeBeyond(grid, [r, c], exit.dir)
        // A way out that names a gate and leads nowhere this compiler can find would otherwise be a
        // corridor with no gate on it at all — the floor would read as more open than it is.
        if (!door)
          throw new Error(
            `floorLock: on site ${grid.siteId}, the way ${exit.dir} out of ${r},${c} is gated by ` +
              `${exit.gateKeyId} but leads to no room`
          )
        doorsBySwitch.set(posKey(r, c), [
          ...(doorsBySwitch.get(posKey(r, c)) ?? []),
          { at: door, keyId: exit.gateKeyId },
        ])
      }
    }
  if (doorsBySwitch.size === 0) return undefined

  const { ids, of } = regionsOf(grid)
  const gates: LockSpec["gates"] = {}
  const mechanisms: Record<string, Mechanism> = {}
  /** Every mechanism with a say in a gate: a boundary naming several keys answers to all of them. */
  const ownersOf = new Map<GateId, Set<MechanismId>>()
  /** The keys of a gate no mechanism on this floor opens — what the sealing pass below reads. */
  const unopened = new Map<GateId, Set<string>>()
  /** Which gates one door grew for one of its keys. Indexed by the DOOR, so a key id that collides
   * with another door's elsewhere on the floor cannot hand a switch a door that is not its own. */
  const gatesOfDoorKey = new Map<string, GateId[]>()
  /** Every gate any door named with a key id — what the chest that mints that key opens. */
  const gatesByKeyId = new Map<string, GateId[]>()

  const claim = (gateId: GateId, keyId: string, mechanismId: MechanismId) => {
    ownersOf.set(gateId, (ownersOf.get(gateId) ?? new Set()).add(mechanismId))
    unopened.get(gateId)!.delete(keyId)
  }

  // Each door is joined to every region it touches. The owners are filled in below; a gate with no
  // owner is rejected by the walk, so every door has to be accounted for.
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      const keyIds = doorKeysOf(cell)
      if (keyIds.length === 0 || !walkable(cell)) continue
      // A WARD GATE IS SHUT BECAUSE IT IS A WARD GATE. Its key is earned elsewhere in the world, so a
      // lock leaning on one could only ever be checked in context; the container rule is that it is
      // assumed shut, which is the reading that keeps the answer local. Deciding that from "nothing
      // on this floor mints it" would open the day a floor minted a tomb key on itself.
      const ward = cell.type === "room" && cell.gateVariant === "tomb-key"
      const doorRegion = of.get(posKey(r, c))!
      for (const dir of dirsOf(cell)) {
        const [dr, dc] = MOVES[dir]
        const beside = of.get(posKey(r + dr, c + dc))
        if (!beside || beside === doorRegion) continue
        const gateId = `${doorRegion}|${beside}`
        gates[gateId] = { from: beside, to: doorRegion, owners: [] }
        unopened.set(gateId, new Set(keyIds))
        if (ward) continue
        for (const keyId of keyIds) {
          gatesOfDoorKey.set(doorKey(doorRegion, keyId), [
            ...(gatesOfDoorKey.get(doorKey(doorRegion, keyId)) ?? []),
            gateId,
          ])
          gatesByKeyId.set(keyId, [...(gatesByKeyId.get(keyId) ?? []), gateId])
        }
      }
    }

  // A switch: unset until it is solved, then one state per way out, and re-solvable from any state
  // into any other — which is what lets a player change their mind, and the only reason the doors it
  // shut are not a trap. Solving it routes to a way out, so no move puts it back to "unset".
  for (const [switchPos, doors] of doorsBySwitch) {
    const id = `switch ${switchPos}`
    const byDoor = doors.map(({ at: [dr, dc], keyId }) => {
      const cell = grid.cells[dr][dc]
      // The switch names the key, the door carries it, and nothing else on the floor compares the
      // two: a misspelling would leave the branch shut for ever with no gate answering to the board.
      if (cell.type !== "room" || cell.requiredKeyId !== keyId)
        throw new Error(
          `floorLock: on site ${grid.siteId}, the switch at ${switchPos} gates ${dr},${dc} with ${keyId}, ` +
            `but that room asks for ${(cell.type === "room" && cell.requiredKeyId) || "no key"}`
        )
      const found = gatesOfDoorKey.get(doorKey(of.get(posKey(dr, dc))!, keyId))
      if (!found)
        throw new Error(
          `floorLock: on site ${grid.siteId}, the door at ${dr},${dc} gated by ${keyId} borders no region ` +
            `the walk can enter it from`
        )
      return { gateIds: found, keyId }
    })
    const states = ["unset", ...doors.map(({ at: [dr, dc] }) => `open ${dr},${dc}`)]
    const opens: Record<string, GateId[]> = { unset: [] }
    states.slice(1).forEach((state, n) => (opens[state] = byDoor[n].gateIds))
    mechanisms[id] = {
      states,
      initial: "unset",
      opens,
      transitions: states.flatMap(from =>
        states.filter(to => to !== from && to !== "unset").map(to => ({ from, to, at: of.get(switchPos)! }))
      ),
    }
    for (const { gateIds, keyId } of byDoor) for (const gateId of gateIds) claim(gateId, keyId, id)
  }

  // A floor key: found once, held for good, and one mechanism however many chests mint it — two
  // chests are two ways to throw the same switch, each in the region its own room stands in.
  const chestsByKeyId = new Map<string, RegionId[]>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || cell.reward?.type !== "tombKey") continue
      const keyId = (cell.reward as TombKeyReward).keyId
      const at = of.get(posKey(r, c))
      if (!gatesByKeyId.has(keyId) || !at) continue
      chestsByKeyId.set(keyId, [...(chestsByKeyId.get(keyId) ?? []), at])
    }
  for (const [keyId, at] of chestsByKeyId) {
    const gateIds = gatesByKeyId.get(keyId)!
    const id = `key ${keyId}`
    mechanisms[id] = {
      states: ["absent", "held"],
      initial: "absent",
      opens: { absent: [], held: gateIds },
      transitions: at.map(region => ({ from: "absent", to: "held", at: region })),
    }
    for (const gateId of gateIds) claim(gateId, keyId, id)
  }

  // WHAT IS LEFT IS SEALED. A door whose opener this floor does not hold — a ward gate, a key minted
  // somewhere else, a hieroglyph the player completes off this floor — is assumed shut, because a
  // barrier the compiler cannot model has to come out shut rather than absent.
  for (const [gateId, keyIds] of unopened)
    for (const keyId of keyIds) {
      const id = `sealed ${keyId}`
      mechanisms[id] ??= { states: ["shut"], initial: "shut", opens: { shut: [] }, transitions: [] }
      ownersOf.set(gateId, (ownersOf.get(gateId) ?? new Set()).add(id))
    }
  for (const [gateId, gate] of Object.entries(gates)) gate.owners = [...ownersOf.get(gateId)!]

  const oneWays = oneWaysOf(grid, of)

  return {
    regions: ids,
    gates,
    mechanisms,
    ...(oneWays.length > 0 ? { oneWays } : {}),
    in: of.get(posKey(grid.entrancePos[0], grid.entrancePos[1]))!,
    out: of.get(posKey(grid.exitPos[0], grid.exitPos[1]))!,
  }
}
