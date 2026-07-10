import { describe, expect, it } from "vitest"
import { buildFloor, buildSite, wireStaircases } from "./buildSite"
import type { FloorConfig } from "./types"

describe("buildFloor", () => {
  it("defaults to an exiting, reward-free floor", () => {
    expect(buildFloor({ pathPuzzles: 2, difficulty: "starter", sideSections: [] })).toEqual({
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    })
  })

  it("carries through optional fields only when defined", () => {
    const floor = buildFloor({
      pathPuzzles: 1,
      difficulty: "starter",
      sideSections: [],
      encounter: "tableau",
      lastMainPuzzleFamily: "crocodile",
      corridorStraightness: 0.5,
    })
    expect(floor.encounter).toBe("tableau")
    expect(floor.lastMainPuzzleFamily).toBe("crocodile")
    expect(floor.corridorStraightness).toBe(0.5)
    expect(floor.packing).toBeUndefined()
  })
})

describe("wireStaircases", () => {
  it("links each floor's exit to the next floor's entrance, leaving the last floor untouched", () => {
    const floors: FloorConfig[] = [
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
    ]
    wireStaircases(floors, fi => `j:${fi}`)
    expect(floors[0].exitOrStaircase).toEqual({ stairId: "j:0" })
    expect(floors[1].entrance).toEqual({ stairId: "j:0" })
    expect(floors[1].exitOrStaircase).toEqual({ stairId: "j:1" })
    expect(floors[2].entrance).toEqual({ stairId: "j:1" })
    expect(floors[2].exitOrStaircase).toBe("exit")
  })

  it("does nothing for a single floor", () => {
    const floors = [buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] })]
    wireStaircases(floors, fi => `j:${fi}`)
    expect(floors[0].exitOrStaircase).toBe("exit")
    expect(floors[0].entrance).toBeUndefined()
  })
})

describe("buildSite", () => {
  const baseCtx = {
    journeyId: "j1",
    tier: "starter" as const,
    pyramidIndex: 0,
    levelCount: 3,
    pathPuzzles: 3,
    constraint: {},
    difficulty: "starter" as const,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    mosaicPathCount: 0,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" as const }),
  }

  it("single-floor branch: no floors[]/mainFloors/wardWings authored → one exiting floor", () => {
    const { floors } = buildSite(baseCtx)
    expect(floors).toHaveLength(1)
    expect(floors[0].exitOrStaircase).toBe("exit")
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("authored floors[] branch: one FloorConfig per entry, last floor carries mainEndReward", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: { floors: [{ pathPuzzles: 1 }, { pathPuzzles: 2 }] },
    })
    expect(floors).toHaveLength(2)
    expect(floors[0].mainEndReward).toBeUndefined()
    expect(floors[1].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("auto multi-floor branch: mainFloors > 1 chains floors via wireStaircases, non-last floor gets a real reward slot", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { mainFloors: 3 } })
    expect(floors).toHaveLength(3)
    expect(floors[0].exitOrStaircase).toEqual({ stairId: expect.stringContaining("main0") })
    // Non-last main floors must carry a real mainEndReward (fragmentSlot), never leave it
    // unset — an unset mainEndReward used to fall back to a free, uncounted mosaicPiece.
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[1].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[2].exitOrStaircase).toBe("exit")
    expect(floors[2].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("assigns puzzle-solve rewards across the built floors", () => {
    const { floors } = buildSite({ ...baseCtx, pathPuzzles: 20 })
    expect(floors[0].puzzleRewards).toHaveLength(20)
    expect(floors[0].puzzleRewards?.some(r => r !== undefined)).toBe(true)
  })

  it("gives different pyramids in the same journey different puzzle-reward patterns", () => {
    // Regression guard: assignPuzzleRewards must be seeded per-pyramid, not per-journey —
    // every other seed helper in this file (resolveKeyColors, resolveChanceValue) folds in
    // pyramidIndex; this one originally didn't, so every pyramid in a journey got an
    // identical (often exact-duplicate) reward layout.
    const first = buildSite({ ...baseCtx, pyramidIndex: 0, pathPuzzles: 20 })
    const second = buildSite({ ...baseCtx, pyramidIndex: 1, pathPuzzles: 20 })
    expect(first.floors[0].puzzleRewards).not.toEqual(second.floors[0].puzzleRewards)
  })
})
