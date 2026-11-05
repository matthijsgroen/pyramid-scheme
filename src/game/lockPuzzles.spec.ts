import { describe, expect, it } from "vitest"
import type { Lock } from "./lockAuthoring"
import { corridorUnfed, lockGroundUnfed } from "./lockPuzzles"
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
})

describe(corridorUnfed, () => {
  it("a corridor whose assigned side path stands elsewhere is named", () => {
    const laid = {
      stretches: new Map([["corridor:A>B", ["0,2", "0,4", "0,6"]]]),
      absorbed: [
        { section: 0, cells: ["0,2", "0,4"] },
        { section: 1, cells: ["0,6", "2,6"] },
        { section: 2, cells: ["4,4"] },
      ],
    }
    const demands = [
      { section: 0, kinds: ["puzzle" as const, "reward" as const], corridor: "A>B" },
      { section: 1, kinds: ["puzzle" as const, "reward" as const], corridor: "A>B" },
      { section: 2, kinds: ["reward" as const] },
    ]
    expect(corridorUnfed(laid, demands)).toEqual(["side path s1 on A>B has a room off it"])
  })
})
