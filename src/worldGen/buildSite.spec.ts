import { describe, expect, it } from "vitest"
import { buildFloor, buildSite, wireStaircases } from "./buildSite"
import type { FloorConfig } from "./types"
import type { PyramidConstraint } from "./dsl"

describe("buildFloor", () => {
  it("defaults to an exiting floor with no main reward (the caller/site decides the chest)", () => {
    // buildFloor stays reward-agnostic — it runs before staircase wiring, so it can't know whether
    // this floor truly exits. The site (buildSite) decides the main-end loot slot per structure.
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
      pathPuzzles: 2,
      difficulty: "starter",
      sideSections: [],
      encounter: "tableau",
      encountersByIndex: { 1: "crocodile" },
      corridorStraightness: 0.5,
    })
    expect(floor.encounter).toBe("tableau")
    expect(floor.encountersByIndex).toEqual({ 1: "crocodile" })
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
    tierOrdinal: 0,
    tierJourneyCount: 1,
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

  it("authored floors[] branch: one FloorConfig per entry, every floor's main path bears a loot slot", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: { floors: [{ pathPuzzles: 1 }, { pathPuzzles: 2 }] },
    })
    expect(floors).toHaveLength(2)
    // Each floor's main path exits into a treasure chest (floors chain via side-section staircases),
    // so both get an untagged loot slot — a non-last floor is no longer an empty chest.
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[1].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("authored floors[] branch: a floor's own mainEndReward/nodes/encounter override the site defaults — a tomb's self-gated shortcut", () => {
    const { floors } = buildSite<"tombTreasure">({
      ...baseCtx,
      resolveReward: spec => (spec === "tombTreasure" ? { type: "tombKey", keyId: "k1" } : undefined),
      constraint: {
        floors: [
          { pathPuzzles: 1, mainEndReward: "tombTreasure", encounter: "tableau" },
          { pathPuzzles: 2, nodes: [{ where: "last", encounter: "crocodile" }] },
        ],
      } as PyramidConstraint,
    })
    expect(floors[0].mainEndReward).toEqual({ type: "tombKey", keyId: "k1" })
    expect(floors[0].encounter).toBe("tableau")
    // `nodes: [{where:"last"}]` on a 2-node path resolves to index 1.
    expect(floors[1].encountersByIndex).toEqual({ 1: "crocodile" })
    // Non-last floor's own reward, not the site-level fallback (which never runs here).
    expect(floors[0].mainEndReward).not.toEqual({ type: "fragmentSlot" })
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

  it("inits an empty puzzle-reward array per chain (fill happens later, in the placement pass)", () => {
    const { floors } = buildSite({ ...baseCtx, pathPuzzles: 20 })
    expect(floors[0].rewards).toHaveLength(20)
    // buildSite only creates the slots; the dynamic-loot distributions fill them
    // (dynamicDistributions.spec covers fill + the per-site seed variation).
    expect(floors[0].rewards?.every(r => r === undefined)).toBe(true)
  })
})
