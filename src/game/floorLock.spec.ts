import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { walkLock } from "./lockWalk"
import { oneWayRuns } from "./gridNavigation"
import { floorLock } from "./floorLock"
import { nodeBeyond } from "./siteValidator"
import { floorWithHandle } from "./testSupport/handleFixtures"
import { MECHANISM_AT_REST } from "@/game/siteTypes"

const plainFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

// A floor that must carve one junction with two ways out free to close, and stands a puzzle in it.
const switchFloor = (): FloorConfig => ({
  ...plainFloor(),
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
  ],
})

// Whether a finished room is walked back into is the family registry's answer, and core assembles
// without the registry — a switch is refused outright unless its family offers the walk back, so the
// stub grants it. (The same stub `src/worldGen/switchAuthoring.spec.ts` uses, for the same reason.)
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const standsASwitch = (grid: FloorGrid): boolean =>
  grid.cells.flat().some(cell => cell.type === "room" && (cell.exits ?? []).some(exit => exit.gateKeyId !== undefined))

// Two sibling side paths warded by the same key — on a carve where both doors border the same
// stretch of corridor (picked below by `wardsCollide`), a gate named by its key alone collides: the
// second door's gate overwrites the first's and leaves it with none.
const wardedTwice = (): FloorConfig => ({
  ...switchFloor(),
  sideSections: [
    ...switchFloor().sideSections,
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "spec_ward" } },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "spec_ward" } },
  ],
})

const withFloorKey = (): FloorConfig => ({
  ...switchFloor(),
  sideSections: [
    ...switchFloor().sideSections,
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "floor-key" } },
  ],
})

// A region computation independent of floorLock itself — the same split into "one cell per door,
// everything else floods" the compiler makes, kept as a separate witness so a fixture-selection
// predicate (and the strengthened assertion below) can check the compiler's OUTPUT against the
// grid's own geometry instead of trusting whatever floorLock happens to produce, buggy or not.
// The duplication is the point: sharing floorLock's own implementation would make the assertion
// compare the compiler against itself and pass whatever it did.
const posKey = (r: number, c: number) => `${r},${c}`
const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const walkable = (cell: GridCell | undefined) =>
  !!cell && (cell.type === "room" || cell.type === "corridor") && !cell.hidden
const doorKeyOf = (cell: GridCell | undefined) => (cell?.type === "room" ? cell.requiredKeyId : undefined)
const dirsOf = (cell: GridCell) => (cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set<string>())

const regionsExcludingDoors = (grid: FloorGrid): Map<string, string> => {
  const regionOf = new Map<string, string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (!walkable(cell) || regionOf.has(posKey(r, c)) || doorKeyOf(cell) !== undefined) continue
      // Matches floorLock.ts's own region-id scheme (`at r,c`), so a door's gates (named against
      // THAT scheme) can be compared against this witness by plain set equality.
      const id = `at ${posKey(r, c)}`
      const queue: Array<[number, number]> = [[r, c]]
      regionOf.set(posKey(r, c), id)
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!
        for (const dir of dirsOf(grid.cells[qr][qc])) {
          const [dr, dc] = MOVES[dir as string]
          const [nr, nc] = [qr + dr, qc + dc]
          const next = grid.cells[nr]?.[nc]
          if (!walkable(next) || doorKeyOf(next) !== undefined || regionOf.has(posKey(nr, nc))) continue
          regionOf.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }
  return regionOf
}

// Every region a door at (r, c) actually touches, read off the raw grid — the ground truth a door's
// gates are checked against below, and what `wardsCollide` uses to pick a carve where the id
// collision has something to bite.
const neighbouringRegions = (grid: FloorGrid, regionOf: Map<string, string>, r: number, c: number): Set<string> => {
  const besides = new Set<string>()
  for (const dir of dirsOf(grid.cells[r][c])) {
    const [dr, dc] = MOVES[dir as string]
    const region = regionOf.get(posKey(r + dr, c + dc))
    if (region) besides.add(region)
  }
  return besides
}

// Whether the two "spec_ward" doors border a shared stretch of corridor — the geometry the id
// collision only breaks on. `wardedTwice`'s hub grouping is randomised per seed, so most carves put
// the two doors on unrelated branches (harmless either way); this is what picks a seed where they
// actually meet, so reverting the fix has something to fail on.
const wardDoorsShareABoundary = (grid: FloorGrid): boolean => {
  const regionOf = regionsExcludingDoors(grid)
  const besidesByDoor: Set<string>[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (doorKeyOf(grid.cells[r][c]) !== "spec_ward") continue
      besidesByDoor.push(neighbouringRegions(grid, regionOf, r, c))
    }
  return besidesByDoor.some((set, i) => besidesByDoor.some((other, j) => i !== j && [...set].some(x => other.has(x))))
}
const wardsCollide = (grid: FloorGrid): boolean => standsASwitch(grid) && wardDoorsShareABoundary(grid)

const OPPOSITE: Record<string, Direction> = { n: "s", s: "n", e: "w", w: "e" }

// Every cell pair the grid joins in one direction and not the other, read off the raw grid — the
// same witness src/game/oneWayCarve.spec.ts keeps under this name, duplicated here for the same
// reason `regionsExcludingDoors` above is: asking floorLock itself whether a drop crosses regions
// would check the compiler against its own output and pass whatever it produced, bug or not.
const oneWayEdges = (grid: FloorGrid): { from: [number, number]; to: [number, number] }[] => {
  const found: { from: [number, number]; to: [number, number] }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of dirsOf(cell)) {
        const [dr, dc] = MOVES[dir as string]
        const [nr, nc] = [r + dr, c + dc]
        const next = grid.cells[nr]?.[nc]
        if (!next || next.type === "empty") continue
        if (!dirsOf(next).has(OPPOSITE[dir as string])) found.push({ from: [r, c], to: [nr, nc] })
      }
    }
  return found
}

// A seed where a drop's two endpoints land in different regions of the witness above — most carves
// attach "upper" and "lower" to the same open hub the switch's own sideSections fork from, so the
// drop lands inside one region (a move the walk needs no telling about) on most seeds; this is what
// finds one where it genuinely spans two.
const dropCrossesRegions = (grid: FloorGrid): boolean => {
  if (!standsASwitch(grid)) return false
  const regionOf = regionsExcludingDoors(grid)
  return oneWayEdges(grid).some(({ from, to }) => {
    const a = regionOf.get(posKey(from[0], from[1]))
    const b = regionOf.get(posKey(to[0], to[1]))
    return a !== undefined && b !== undefined && a !== b
  })
}

const withDrop = (): FloorConfig => ({
  ...switchFloor(),
  sideSections: [
    ...switchFloor().sideSections,
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
})

// The cells the entrance reaches across passages open BOTH ways, never stepping on `shut` — a witness
// of its own, so what the compiler's regions swallow is not checked against the compiler's own flood.
const twoWayReach = (grid: FloorGrid, shut: string): Set<string> => {
  const start = posKey(grid.entrancePos[0], grid.entrancePos[1])
  const seen = new Set<string>()
  if (start === shut) return seen
  seen.add(start)
  const queue = [start]
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at].split(",").map(Number)
    for (const dir of dirsOf(grid.cells[r][c])) {
      const [dr, dc] = MOVES[dir as string]
      const [nr, nc] = [r + dr, c + dc]
      const next = grid.cells[nr]?.[nc]
      if (!walkable(next) || !dirsOf(next!).has(OPPOSITE[dir as string])) continue
      if (posKey(nr, nc) === shut || seen.has(posKey(nr, nc))) continue
      seen.add(posKey(nr, nc))
      queue.push(posKey(nr, nc))
    }
  }
  return seen
}

const twoWayRegions = (grid: FloorGrid): Map<string, string> => {
  const regionOf = new Map<string, string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (!walkable(grid.cells[r][c]) || regionOf.has(posKey(r, c)) || doorKeyOf(grid.cells[r][c]) !== undefined)
        continue
      const id = `at ${posKey(r, c)}`
      const queue: Array<[number, number]> = [[r, c]]
      regionOf.set(posKey(r, c), id)
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!
        for (const dir of dirsOf(grid.cells[qr][qc])) {
          const [dr, dc] = MOVES[dir as string]
          const [nr, nc] = [qr + dr, qc + dc]
          const next = grid.cells[nr]?.[nc]
          if (!walkable(next) || !dirsOf(next!).has(OPPOSITE[dir as string])) continue
          if (doorKeyOf(next!) !== undefined || regionOf.has(posKey(nr, nc))) continue
          regionOf.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }
  return regionOf
}

// THE ONE SHAPE `oneWays` EXISTS TO REPORT: a drop whose landing ground has no other way in. One cell
// on the ordinary way in is restated as a door nothing on the floor mints the key for, so what is left
// past it is entered by the drop alone. Undefined on a carve where no single cell cuts it off.
const sealTheWayIntoTheDrop = (grid: FloorGrid): FloorGrid | undefined => {
  const open = twoWayReach(grid, "")
  // A switch names its door by direction and the floor finds it by walking until the first room, so a
  // barrier stood in the corridor between the two would make the switch gate the fixture's door.
  const towardASwitchsDoor = new Set<string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const [dr, dc] = MOVES[exit.dir as string]
        let [wr, wc] = [r + dr, c + dc]
        while (grid.cells[wr]?.[wc]?.type === "corridor") {
          towardASwitchsDoor.add(posKey(wr, wc))
          ;[wr, wc] = [wr + dr, wc + dc]
        }
      }
    }
  // A drop is a chain of one-way edges, one into each cell of its run and one out of the last — so the
  // pair this needs is the two ends of a chain, the departure that nothing one-way leads into and the
  // landing that leads on to nothing one-way.
  const edges = oneWayEdges(grid)
  const at = (cell: [number, number]) => posKey(cell[0], cell[1])
  const pairs = edges
    .filter(first => !edges.some(into => at(into.to) === at(first.from)))
    .map(first => {
      let step = first
      for (;;) {
        const next = edges.find(outOf => at(outOf.from) === at(step.to))
        if (!next) break
        step = next
      }
      return { source: at(first.from), landing: at(step.to) }
    })
  for (const { source, landing } of pairs) {
    if (!open.has(source) || !open.has(landing)) continue
    for (const key of open) {
      if (key === source || key === landing || towardASwitchsDoor.has(key)) continue
      const [r, c] = key.split(",").map(Number)
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      if (isAt(grid.entrancePos, r, c) || isAt(grid.exitPos, r, c)) continue
      // Neither an existing door nor the switch itself: the fixture stands ONE new barrier, and a
      // switch restated as a door would leave its own board answering for nothing.
      if (cell.type === "room" && (cell.requiredKeyId || (cell.exits ?? []).some(e => e.gateKeyId))) continue
      const cut = twoWayReach(grid, key)
      if (!cut.has(source) || cut.has(landing)) continue
      const cells = grid.cells.map(row => [...row])
      cells[r][c] = {
        ...cell,
        type: "room",
        roomType: "encounter",
        requiredKeyId: "nothing-mints-this",
        gateVariant: "floor-key",
        keyIsAuthored: true,
      }
      return { ...grid, cells }
    }
  }
  return undefined
}

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves what the
// test needs — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig, wants: (grid: FloorGrid) => boolean = () => true): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, reEnterableFamilies, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success && wants(result.grid)) return result.grid
  }
  throw new Error("no seed carved the floor this spec needs")
}

const isAt = (pos: readonly [number, number], r: number, c: number) => pos[0] === r && pos[1] === c

/** The first room a carve put where the test needs one; running out is a throw, never a silent pass. */
const findRoom = (grid: FloorGrid, wants: (cell: RoomCell, r: number, c: number) => boolean): [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && wants(cell, r, c)) return [r, c]
    }
  throw new Error("no room on this carve is the one this spec needs")
}

/** A switch, one of the ways out it closed, and the key it names on that way out. */
const aGatedWayOut = (grid: FloorGrid) => {
  const switchAt = findRoom(grid, cell => (cell.exits ?? []).some(exit => exit.gateKeyId !== undefined))
  const exit = (grid.cells[switchAt[0]][switchAt[1]] as RoomCell).exits!.find(e => e.gateKeyId !== undefined)!
  return { switchAt, door: nodeBeyond(grid, switchAt, exit.dir)!, keyId: exit.gateKeyId! }
}

/** One room restated — how a fixture stands a barrier the carve itself would never author. */
const rewrite = (grid: FloorGrid, [r, c]: readonly [number, number], patch: Partial<RoomCell>): FloorGrid => {
  const cells = grid.cells.map(row => [...row])
  cells[r][c] = { ...(cells[r][c] as RoomCell), ...patch }
  return { ...grid, cells }
}

describe("floorLock", () => {
  it("has nothing to say about a floor with no switch on it", () => {
    expect(floorLock(assembled(plainFloor()))).toBeUndefined()
  })

  it("names one mechanism per switch: rest until solved, then a state per way out", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes(MECHANISM_AT_REST))!
    expect(board.states.length).toBeGreaterThanOrEqual(3)
    expect(board.opens[MECHANISM_AT_REST]).toEqual([])
    for (const state of board.states.filter(s => s !== MECHANISM_AT_REST))
      expect(board.opens[state].length).toBeGreaterThan(0)
    // Re-solvable from every state into every other, which is what lets a player change their mind,
    // and back to "rest" as well: the board can be turned off every shrine again, so every state is a
    // target from every other one.
    expect(board.transitions).toHaveLength(board.states.length * (board.states.length - 1))
  })

  it("compiles a handle into two sides it can be thrown between either way, starting on the left", () => {
    const spec = floorLock(floorWithHandle({ in: "lever", left: ["vault"], right: ["pocket"] }).grid)!
    const handle = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("handle "))![1]
    expect(handle.states).toEqual(["left", "right"])
    expect(handle.initial).toBe("left")
    expect(handle.opens.left).toHaveLength(handle.opens.right.length)
    expect(handle.opens.left).not.toEqual(handle.opens.right)
    expect(handle.transitions.map(({ from, to }) => `${from}>${to}`).sort()).toEqual(["left>right", "right>left"])
  })

  it("starts a handle on the side its record names, never on a rest position it has not got", () => {
    const spec = floorLock(floorWithHandle({ in: "lever", left: ["vault"], right: ["pocket"], starts: "right" }).grid)!
    const handle = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("handle "))![1]
    expect(handle.initial).toBe("right")
    expect(handle.states).not.toContain(MECHANISM_AT_REST)
  })

  it("hands the walk a lever it can read, whichever side the author hangs it on", () => {
    for (const starts of ["left", "right"] as const) {
      const grid = floorWithHandle({ in: "lever", left: ["vault"], right: ["pocket"], starts }).grid
      const result = walkLock(floorLock(grid)!)
      expect(result.sound || result.failure.type !== "malformed").toBe(true)
    }
  })

  it("keeps both sides of a lever whose far side drives nothing, so its door can be shut again", () => {
    const spec = floorLock(floorWithHandle({ in: "lever", left: ["vault"], right: [] }).grid)!
    const handle = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("handle "))![1]
    expect(handle.states).toEqual(["left", "right"])
    expect(handle.opens.right).toEqual([])
    expect(handle.opens.left.length).toBeGreaterThan(0)
    expect(handle.transitions.map(({ from, to }) => `${from}>${to}`).sort()).toEqual(["left>right", "right>left"])
  })

  it("folds every section one side names into that side's open set", () => {
    const spec = floorLock(floorWithHandle({ in: "lever", left: ["vault", "pocket"], right: ["vault2"] }).grid)!
    const handle = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("handle "))![1]
    // Two doors on the left, one on the right — each door being one gate per region it touches, so the
    // left set is the bigger one however many gates a single door came out as.
    expect(handle.opens.left.length).toBeGreaterThan(handle.opens.right.length)
  })

  it("lets a switch be put back to the position that opens nothing, because a board can be left unlit", () => {
    const spec = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("switch "))![1]
    expect(board.initial).toBe(MECHANISM_AT_REST)
    for (const from of board.states.filter(state => state !== MECHANISM_AT_REST))
      expect(board.transitions).toContainEqual(expect.objectContaining({ from, to: MECHANISM_AT_REST }))
  })

  it("declares every region it then refers to", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    expect(lock.regions).toContain(lock.in)
    expect(lock.regions).toContain(lock.out)
    for (const gate of Object.values(lock.gates)) {
      expect(lock.regions).toContain(gate.from)
      expect(lock.regions).toContain(gate.to)
    }
  })

  it("stands the switch in the region its doors lead out of, so the opener comes before the blocker", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes(MECHANISM_AT_REST))!
    const at = new Set(board.transitions.map(transition => transition.at))
    expect(at.size).toBe(1)
    const [fork] = [...at]
    // Each way out it shuts is one door, and a door is a region joined to the fork it leads out of and
    // to whatever lies beyond it. So every state opens the gates of exactly one door, and one of them
    // starts in the fork the player is standing in.
    for (const state of board.states.filter(s => s !== MECHANISM_AT_REST)) {
      expect(new Set(board.opens[state].map(gateId => lock.gates[gateId].to)).size).toBe(1)
      expect(board.opens[state].some(gateId => lock.gates[gateId].from === fork)).toBe(true)
    }
  })

  it("hands the walk a lock that reads", () => {
    const result = walkLock(floorLock(assembled(switchFloor(), standsASwitch))!)
    expect(result.sound || result.failure.type !== "malformed").toBe(true)
  })

  it("gives every door a gate into each region it touches, even when two doors want one key", () => {
    const grid = assembled(wardedTwice(), wardsCollide)
    const lock = floorLock(grid)!
    const regionOf = regionsExcludingDoors(grid)
    const doors: Array<{ region: string; pos: [number, number] }> = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++)
        if (doorKeyOf(grid.cells[r][c]) !== undefined) doors.push({ region: `door ${r},${c}`, pos: [r, c] })
    expect(doors.length).toBeGreaterThan(1)
    // Every region a door touches on the grid has to show up as a gate leading to it — not just
    // some gate, which two colliding doors can each still have via whichever neighbour didn't
    // collide, but the FULL set the naming bug is free to drop one of.
    for (const door of doors) {
      const wanted = neighbouringRegions(grid, regionOf, door.pos[0], door.pos[1])
      const got = new Set(
        Object.values(lock.gates)
          .filter(gate => gate.to === door.region)
          .map(gate => gate.from)
      )
      expect(got).toEqual(wanted)
    }
  })

  it("seals a ward gate, because a key earned elsewhere cannot be proved from this floor", () => {
    const lock = floorLock(assembled(wardedTwice(), wardsCollide))!
    const sealed = Object.entries(lock.mechanisms).filter(([id]) => id.startsWith("sealed "))
    expect(sealed.length).toBeGreaterThan(0)
    for (const [, mechanism] of sealed) {
      expect(mechanism.states).toEqual(["shut"])
      expect(mechanism.transitions).toEqual([])
      expect(Object.values(mechanism.opens).flat()).toEqual([])
    }
  })

  it("makes a room asking for several keys a door as well, sealed by every one of them", () => {
    const grid = assembled(switchFloor(), standsASwitch)
    const at = findRoom(
      grid,
      (cell, r, c) =>
        !cell.requiredKeyId &&
        !(cell.exits ?? []).some(exit => exit.gateKeyId !== undefined) &&
        cell.dirs.size > 1 &&
        !isAt(grid.entrancePos, r, c) &&
        !isAt(grid.exitPos, r, c)
    )
    // A tableau needing two hieroglyphs complete: the game refuses the step until both are held, and
    // nothing on the floor mints either, so every boundary it stands in has to come out shut.
    const lock = floorLock(rewrite(grid, at, { requiredKeyIds: ["hiero:a", "hiero:b"] }))!
    const doorRegion = `door ${at[0]},${at[1]}`
    expect(lock.regions).toContain(doorRegion)
    const into = Object.values(lock.gates).filter(gate => gate.to === doorRegion)
    expect(into.length).toBeGreaterThan(0)
    for (const gate of into) expect(new Set(gate.owners)).toEqual(new Set(["sealed hiero:a", "sealed hiero:b"]))
  })

  it("seals a ward gate even when a chest on this floor mints the key it names", () => {
    const grid = assembled(withFloorKey(), standsASwitch)
    const minted = new Set(
      grid.cells
        .flat()
        .flatMap(cell => (cell.type === "room" && cell.reward?.type === "tombKey" ? [cell.reward.keyId] : []))
    )
    const at = findRoom(grid, cell => !!cell.requiredKeyId && minted.has(cell.requiredKeyId))
    const keyId = (grid.cells[at[0]][at[1]] as RoomCell).requiredKeyId!
    // The container rule is categorical: a ward key is earned elsewhere, so the door is shut because
    // it is a ward door — not because this floor happened to mint nothing that opens it.
    const lock = floorLock(rewrite(grid, at, { gateVariant: "tomb-key" }))!
    expect(lock.mechanisms[`key ${keyId}`]).toBeUndefined()
    const into = Object.values(lock.gates).filter(gate => gate.to === `door ${at[0]},${at[1]}`)
    expect(into.length).toBeGreaterThan(0)
    for (const gate of into) expect(gate.owners).toEqual([`sealed ${keyId}`])
  })

  it("refuses a switch whose door does not carry the key the switch names", () => {
    const grid = assembled(switchFloor(), standsASwitch)
    const { door } = aGatedWayOut(grid)
    expect(() => floorLock(rewrite(grid, door, { requiredKeyId: "misspelled" }))).toThrow(/misspelled/)
  })

  it("refuses a gated way out that leads to no room, which would read as an open corridor", () => {
    const nowhere: FloorGrid = {
      cells: [
        [
          {
            type: "room",
            roomType: "fork",
            dirs: new Set(["e"]),
            state: "fogged",
            exits: [{ dir: "e", kind: "fork", gateKeyId: "spec:key" }],
          } as RoomCell,
          { type: "empty" },
        ],
      ],
      rows: 1,
      cols: 2,
      entrancePos: [0, 0],
      exitPos: [0, 0],
      siteId: "spec:1",
      staircases: {},
    }
    expect(() => floorLock(nowhere)).toThrow(/leads to no room/)
  })

  it("refuses a switch door standing no gate the walk can enter it by", () => {
    const grid = assembled(switchFloor(), standsASwitch)
    const { door } = aGatedWayOut(grid)
    // A switch's own door authored as a ward is a contradiction: the board names a key the container
    // rule says is never opened from this floor. Either way, no gate answers to the board.
    expect(() => floorLock(rewrite(grid, door, { gateVariant: "tomb-key" }))).toThrow(/borders no region/)
  })

  it("opens only its own door, when a door elsewhere on the floor wants the same key", () => {
    const grid = assembled(switchFloor(), standsASwitch)
    const { switchAt, door, keyId } = aGatedWayOut(grid)
    const elsewhere = findRoom(
      grid,
      (cell, r, c) =>
        !cell.requiredKeyId &&
        !(cell.exits ?? []).some(exit => exit.gateKeyId !== undefined) &&
        cell.dirs.size > 1 &&
        !isAt(door, r, c) &&
        !isAt(grid.entrancePos, r, c) &&
        !isAt(grid.exitPos, r, c)
    )
    const lock = floorLock(rewrite(grid, elsewhere, { requiredKeyId: keyId }))!
    const board = lock.mechanisms[`switch ${switchAt[0]},${switchAt[1]}`]
    const foreign = `door ${elsewhere[0]},${elsewhere[1]}`
    for (const state of board.states)
      expect(board.opens[state].map(gateId => lock.gates[gateId].to)).not.toContain(foreign)
    // And the door the switch does not answer for is shut, not left open on a name that matched.
    for (const gate of Object.values(lock.gates).filter(gate => gate.to === foreign))
      expect(gate.owners).toEqual([`sealed ${keyId}`])
  })

  it("keeps one mechanism for a key two chests mint, with a move in each chest's region", () => {
    const grid = assembled(withFloorKey(), standsASwitch)
    const chest = findRoom(grid, cell => cell.reward?.type === "tombKey")
    const reward = (grid.cells[chest[0]][chest[1]] as RoomCell).reward!
    const second = findRoom(
      grid,
      (cell, r, c) => !cell.reward && !cell.requiredKeyId && !isAt(chest, r, c) && !isAt(grid.entrancePos, r, c)
    )
    const lock = floorLock(rewrite(grid, second, { reward }))!
    const keys = Object.entries(lock.mechanisms).filter(([id]) => id.startsWith("key "))
    expect(keys).toHaveLength(1)
    const [, mechanism] = keys[0]
    expect(mechanism.transitions).toHaveLength(2)
    expect(new Set(mechanism.transitions.map(transition => transition.at)).size).toBe(2)
  })

  it("makes a floor key a mechanism thrown in the region its chest stands in", () => {
    const lock = floorLock(assembled(withFloorKey(), standsASwitch))!
    const found = Object.entries(lock.mechanisms).find(([id]) => id.startsWith("key "))
    expect(found).toBeDefined()
    const [, mechanism] = found!
    expect(mechanism.states).toEqual(["absent", "held"])
    expect(mechanism.opens.absent).toEqual([])
    expect(mechanism.opens.held.length).toBeGreaterThan(0)
    expect(mechanism.transitions).toHaveLength(1)
    expect(lock.regions).toContain(mechanism.transitions[0].at)
  })

  it("reports a one-way as a move the walk can take", () => {
    const lock = floorLock(assembled(withDrop(), dropCrossesRegions))!
    expect(lock.oneWays?.length).toBeGreaterThan(0)
    for (const oneWay of lock.oneWays!) {
      expect(lock.regions).toContain(oneWay.from)
      expect(lock.regions).toContain(oneWay.to)
      expect(oneWay.from).not.toBe(oneWay.to)
    }
  })

  // Every seed that carves the shape, not the first: which side of the drop the row-major scan meets
  // first is the seed's choice, and a flood that crossed the drop would report the pocket on the seeds
  // that met it first and swallow it on the rest.
  it("reports a drop whose landing ground has no other way in, on every seed that carves one", () => {
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", withDrop(), seed, reEnterableFamilies, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      const sealed = sealTheWayIntoTheDrop(result.grid)
      if (!sealed) continue
      const lock = floorLock(sealed)
      if (!lock) continue
      checked++
      expect(lock.oneWays ?? []).not.toEqual([])
      for (const oneWay of lock.oneWays!) expect(oneWay.from).not.toBe(oneWay.to)
    }
    expect(checked).toBeGreaterThan(0)
  })

  // A run of ONE_WAY_RUN_CELLS cells is one move for the walk, not one per cell: the compiled lock has
  // to match the floor the author wrote, and the author wrote one drop.
  it("compiles one authored drop to exactly one one-way, between the regions the run falls from and into", () => {
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", withDrop(), seed, reEnterableFamilies, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      const sealed = sealTheWayIntoTheDrop(result.grid)
      if (!sealed) continue
      const lock = floorLock(sealed)
      if (!lock) continue
      checked++
      // The witness floods the raw grid across passages open both ways, doors excluded, in the compiler's
      // own id scheme, so the regions the drop falls from and into are named without asking the compiler.
      const regionOf = twoWayRegions(sealed)
      // A door is a region of exactly one cell, named for it.
      const regionNamed = (cell: readonly [number, number]) =>
        regionOf.get(posKey(cell[0], cell[1])) ?? `door ${posKey(cell[0], cell[1])}`
      const drops = oneWayRuns(sealed)
      expect(drops).toHaveLength(1)
      const [drop] = drops
      expect(lock.oneWays).toEqual([
        {
          from: regionNamed(drop.departure),
          to: regionNamed(drop.landing),
        },
      ])
      // The run's cells are the departure's ground: none of them is a region of its own.
      for (const [r, c] of drop.cells) expect(lock.regions).not.toContain(`at ${posKey(r, c)}`)
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("reports no one-ways for a floor that authors none", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    expect(lock.oneWays ?? []).toEqual([])
  })
})
