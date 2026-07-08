import { describe, expect, it } from "vitest"
import { buildSideSections, pathCountForDensity } from "./sideSections"

// ── pathCountForDensity ───────────────────────────────────────────────────────

describe("pathCountForDensity", () => {
  it("none → always 0", () => {
    expect(pathCountForDensity("none", "starter_1", 0)).toBe(0)
    expect(pathCountForDensity("none", "wizard_1", 7)).toBe(0)
  })

  it("low → always 1", () => {
    expect(pathCountForDensity("low", "starter_1", 0)).toBe(1)
    expect(pathCountForDensity("low", "wizard_1", 7)).toBe(1)
  })

  it("medium → 2 or 3, never outside that range", () => {
    // sample many (journeyId, pyramidIndex) pairs
    const journeys = ["starter_1", "junior_1", "expert_1", "master_1", "wizard_1"]
    for (const j of journeys) {
      for (let i = 0; i < 10; i++) {
        const count = pathCountForDensity("medium", j, i)
        expect(count).toBeGreaterThanOrEqual(2)
        expect(count).toBeLessThanOrEqual(3)
      }
    }
  })

  it("dense → 4 or 5, never outside that range", () => {
    const journeys = ["starter_1", "junior_1", "expert_1", "master_1", "wizard_1"]
    for (const j of journeys) {
      for (let i = 0; i < 10; i++) {
        const count = pathCountForDensity("dense", j, i)
        expect(count).toBeGreaterThanOrEqual(4)
        expect(count).toBeLessThanOrEqual(5)
      }
    }
  })

  it("medium is deterministic — same args always return the same value", () => {
    const a = pathCountForDensity("medium", "expert_1", 3)
    const b = pathCountForDensity("medium", "expert_1", 3)
    expect(a).toBe(b)
  })

  it("medium varies across different pyramids", () => {
    // With 20 pyramids, both 2 and 3 should appear (probabilistically guaranteed by the hash spread)
    const counts = Array.from({ length: 20 }, (_, i) => pathCountForDensity("medium", "starter_1", i))
    expect(counts).toContain(2)
    expect(counts).toContain(3)
  })
})

// ── buildSideSections ────────────────────────────────────────────────────────

const noReward = () => undefined

describe("buildSideSections", () => {
  it("with no options set, produces no sections", () => {
    expect(
      buildSideSections({ tier: "starter", difficulty: "starter", resolveReward: noReward, journeyId: "j" })
    ).toEqual([])
  })

  it("hasMapPieceBranch prepends a mapPiece section pointing at the tier's tomb", () => {
    const sections = buildSideSections({
      tier: "expert",
      difficulty: "expert",
      resolveReward: noReward,
      journeyId: "j",
      hasMapPieceBranch: true,
    })
    expect(sections).toEqual([
      {
        pathPuzzles: 0,
        difficulty: "expert",
        end: "treasure",
        endReward: { type: "mapPiece", tombId: "expert_treasure_tomb" },
      },
    ])
  })

  it("hasWardGate + nextTier prepends a tier-unlock ward gate", () => {
    const sections = buildSideSections({
      tier: "junior",
      difficulty: "junior",
      resolveReward: noReward,
      journeyId: "j",
      hasWardGate: true,
      nextTier: "expert",
    })
    expect(sections).toHaveLength(1)
    expect(sections[0].gate).toEqual({ type: "tomb-key", wardKeyId: expect.any(String) })
  })

  it("hasWardGate without nextTier adds nothing", () => {
    const sections = buildSideSections({
      tier: "wizard",
      difficulty: "wizard",
      resolveReward: noReward,
      journeyId: "j",
      hasWardGate: true,
      nextTier: null,
    })
    expect(sections).toEqual([])
  })

  it("resolves DSL-authored constraintSections via resolveReward", () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: () => ({ type: "mosaicPiece" }),
      journeyId: "j",
      constraintSections: [{ pathPuzzles: 2, endReward: "mosaicPiece" }],
    })
    expect(sections).toEqual([
      { pathPuzzles: 2, difficulty: "starter", end: "treasure", endReward: { type: "mosaicPiece" } },
    ])
  })

  it("recurses into nested sideSections", () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: noReward,
      journeyId: "j",
      constraintSections: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 0, hidden: true }] }],
    })
    expect(sections[0].sideSections).toEqual([{ pathPuzzles: 0, difficulty: "starter", end: "treasure", hidden: true }])
  })

  it('end: "staircase" numbers the stairId by position among already-pushed sections', () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: noReward,
      journeyId: "myJourney",
      hasMapPieceBranch: true,
      constraintSections: [{ pathPuzzles: 1, end: "staircase" }],
    })
    // index 0 = mapPiece branch, index 1 = the staircase section
    expect(sections[1].end).toEqual({ stairId: "myJourney:side1" })
  })

  it("auto mosaic paths respect mosaicPathCount and gate by keyDensity", () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: noReward,
      journeyId: "j",
      mosaicPathCount: 4,
      mainPathPuzzles: 6,
      keyDensity: "medium",
      keyColors: 2,
    })
    expect(sections).toHaveLength(4)
    expect(sections.every(s => s.endReward?.type === "mosaicPiece")).toBe(true)
    expect(sections.filter(s => s.gate).length).toBe(2) // round(4 * 0.5)
  })

  it("declaredSidePaths/declaredHiddenPaths expand by seeded density count", () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: noReward,
      journeyId: "j",
      pyramidIndex: 0,
      declaredSidePaths: [{ density: "low", pathPuzzles: 1, end: "treasure" }],
      declaredHiddenPaths: [{ density: "low", pathPuzzles: 1, end: "fragment" }],
    })
    expect(sections).toHaveLength(2)
    expect(sections[0].hidden).toBeUndefined()
    expect(sections[1]).toMatchObject({ hidden: true, endReward: { type: "fragmentSlot" } })
  })

  it("a resolveReward that runs out (tomb perk stream) omits endReward instead of crashing", () => {
    const sections = buildSideSections({
      tier: "starter",
      difficulty: "starter",
      resolveReward: () => undefined,
      journeyId: "j",
      constraintSections: [{ pathPuzzles: 0, endReward: "tombTreasure" }],
    })
    expect(sections[0].endReward).toBeUndefined()
  })
})
