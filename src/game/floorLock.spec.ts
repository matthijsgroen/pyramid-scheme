import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { FloorConfig, FloorGrid, GridCell } from "./siteTypes"
import { walkLock } from "./lockWalk"
import { floorLock } from "./floorLock"

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

describe("floorLock", () => {
  it("has nothing to say about a floor with no switch on it", () => {
    expect(floorLock(assembled(plainFloor()))).toBeUndefined()
  })

  it("names one mechanism per switch: unset until solved, then a state per way out", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    expect(board.states.length).toBeGreaterThanOrEqual(3)
    expect(board.opens.unset).toEqual([])
    for (const state of board.states.filter(s => s !== "unset")) expect(board.opens[state].length).toBeGreaterThan(0)
    // Re-solvable from every state into every other, which is what lets a player change their mind.
    expect(board.transitions).toHaveLength(board.states.length * (board.states.length - 1))
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
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    const at = new Set(board.transitions.map(transition => transition.at))
    expect(at.size).toBe(1)
    const [fork] = [...at]
    // Each way out it shuts is one door, and a door is a region joined to the fork it leads out of and
    // to whatever lies beyond it. So every state opens the gates of exactly one door, and one of them
    // starts in the fork the player is standing in.
    for (const state of board.states.filter(s => s !== "unset")) {
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
      const got = new Set(Object.values(lock.gates).filter(gate => gate.to === door.region).map(gate => gate.from))
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
})
