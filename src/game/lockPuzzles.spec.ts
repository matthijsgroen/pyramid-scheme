import { describe, expect, it } from "vitest"
import type { Lock } from "./lockAuthoring"
import { judgeLockPuzzles, lockGroundUnfed, lockWithoutPuzzle } from "./lockPuzzles"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { BINDING } from "./testSupport/lockFixtures"
import { leverLock } from "./testSupport/floorLockFixtures"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"

const floorWith = (pathPuzzles: number, lock: Lock = leverLock()): FloorConfig => ({
  pathPuzzles,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock }],
  realisations: BINDING,
})

const carve = (config: FloorConfig, seed: number): FloorGrid => {
  const result = assembleFloor("site", config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "site", floorIndex: 0 },
  })
  if (!result.success) throw new Error(`seed ${seed} does not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const SEEDS = [1, 2, 3, 4, 5]

/** The lever lock placed before the floor's content: every region but its way out takes nothing. */
const beforeContent = (): Lock => ({
  ...leverLock(),
  regions: { foyer: { takes: "nothing" }, hall: { takes: "nothing" }, landing: { takes: "free" } },
})

/** The lever lock with one of its regions asking for something. */
const asking = (region: string, takes: "puzzles" | "reward"): Lock => {
  const lock = leverLock()
  return { ...lock, regions: { ...lock.regions, [region]: { takes } } }
}

/** The authored region (without the lock's name) a puzzle room of the grid stands in. */
const puzzleRegionOf = (grid: FloorGrid): string => {
  const room = grid.cells
    .flat()
    .find(cell => cell.type === "room" && cell.pathIndex !== undefined && cell.region?.startsWith("lever."))
  if (room?.type !== "room" || !room.region) throw new Error("no puzzle room on the lock's ground")
  return room.region.slice("lever.".length)
}

describe(lockWithoutPuzzle, () => {
  it("a lock whose way passes a puzzle room passes", () => {
    for (const seed of SEEDS) expect(lockWithoutPuzzle(carve(floorWith(2), seed), floorWith(2))).toEqual([])
  })

  it("a lock whose control is the only room on its way is named", () => {
    for (const seed of SEEDS) expect(lockWithoutPuzzle(carve(floorWith(0), seed), floorWith(0))).toEqual(["lever"])
  })

  it("an ordinary lock solved before any puzzle, with every puzzle past its way out, is named", () => {
    for (const seed of SEEDS) {
      const grid = carve(floorWith(2, beforeContent()), seed)
      expect(grid.cells.flat().filter(cell => cell.type === "room" && cell.pathIndex !== undefined)).toHaveLength(2)
      expect(lockWithoutPuzzle(grid, floorWith(2))).toEqual(["lever"])
    }
  })

  it("a lock standing before the floor's content is a lesson in the lock alone, asked for no puzzle", () => {
    for (const seed of [0, 2].map(n => SEEDS[n])) {
      const before = floorWith(0, beforeContent())
      expect(judgeLockPuzzles(carve(before, seed), before)).toEqual({ without: [], unjudged: [] })
    }
  })

  it("a lock whose control stands on no ground of its own is unjudged, never passed", () => {
    const grid = carve(floorWith(0), 1)
    const unlabelled: FloorGrid = {
      ...grid,
      cells: grid.cells.map(row =>
        row.map(cell => (cell.type === "room" && cell.mechanism ? { ...cell, region: undefined } : cell))
      ),
    }
    expect(judgeLockPuzzles(grid, floorWith(0))).toEqual({ without: ["lever"], unjudged: [] })
    expect(judgeLockPuzzles(unlabelled, floorWith(0))).toEqual({ without: [], unjudged: ["lever"] })
  })

  it("a floor with no lock names nothing", () => {
    const { locks: _locks, realisations: _realisations, ...bare } = floorWith(1)
    expect(lockWithoutPuzzle(carve(bare, 1), {})).toEqual([])
  })
})

describe(lockGroundUnfed, () => {
  it("a region asking for puzzles that holds none is named", () => {
    const grid = carve(floorWith(0), 1)
    expect(lockGroundUnfed(grid, floorWith(0, asking("hall", "puzzles")))).toEqual([
      "lever.hall asks for puzzles and holds none",
    ])
  })

  it("a region asking for puzzles that holds one passes", () => {
    for (const seed of SEEDS) {
      const grid = carve(floorWith(2), seed)
      expect(lockGroundUnfed(grid, floorWith(2, asking(puzzleRegionOf(grid), "puzzles")))).toEqual([])
    }
  })

  it("a region asking for a reward is fed by the chest standing in it, and named where none stands", () => {
    const grid = carve(floorWith(0), 1)
    const chestRegion = grid.cells.flat().find(cell => cell.type === "room" && cell.tags?.includes("treasure"))
    if (chestRegion?.type !== "room" || !chestRegion.region) throw new Error("no chest")
    const fed = chestRegion.region.slice("lever.".length)
    const unfed = ["foyer", "hall", "landing"].find(region => region !== fed)!
    expect(lockGroundUnfed(grid, floorWith(0, asking(fed, "reward")))).toEqual([])
    expect(lockGroundUnfed(grid, floorWith(0, asking(unfed, "reward")))).toEqual([
      `lever.${unfed} asks for reward and holds none`,
    ])
  })

  it.todo("a corridor asking for a side path that carries none is named")
})
