import { describe, expect, it } from "vitest"
import { assertChestCapacity, pathCountForDensity } from "./configBuilder"
import type { PyramidPlan } from "./configBuilder"

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

// Minimum pathPuzzles that yields at least 1 chest slot
// chestCountFor(1)=0, chestCountFor(2)=1, chestCountFor(4)=2
const makePlan = (overrides: Partial<PyramidPlan>[]): PyramidPlan[] =>
  overrides.map((o, i) => ({
    journeyId: `j${i}`,
    tier: "starter" as const,
    pathPuzzles: 4,
    pyramidIndex: 0,
    levelCount: 1,
    constraint: {},
    provenance: {},
    ...o,
  }))

describe(assertChestCapacity, () => {
  it("does nothing when capacity is sufficient", () => {
    // 10 pyramids × pathPuzzles=4 → 20 chests, well above any realistic TOTAL_FRAGMENTS
    const plan = makePlan(Array(10).fill({ pathPuzzles: 4 }))
    expect(() => assertChestCapacity(plan)).not.toThrow()
  })

  it("bumps unconstrained pyramids silently when capacity is low", () => {
    // 1 pyramid with pathPuzzles=1 (0 chests) — no explicit provenance on pathPuzzles
    // TOTAL_FRAGMENTS is large; this will need bumping but provenance is empty → no throw
    const plan = makePlan([{ pathPuzzles: 1, provenance: {} }])
    const result = assertChestCapacity(plan)
    expect(result.some(p => p.pathPuzzles > 1)).toBe(true)
  })

  it("throws when an explicitly-constrained pyramid is too small", () => {
    const explicitScope = { level: "tier" as const, tier: "starter" as const }
    const plan = makePlan([
      {
        pathPuzzles: 1, // 0 chests — way too small
        provenance: { pathPuzzles: explicitScope },
      },
    ])
    expect(() => assertChestCapacity(plan)).toThrow(/tier\('starter'\)/)
  })

  it("error message cites journey and pyramid index", () => {
    const explicitScope = { level: "journey-pyramid" as const, journey: "my_journey", pyramid: "last" as const }
    const plan = makePlan([
      {
        journeyId: "my_journey",
        pyramidIndex: 2,
        pathPuzzles: 1,
        provenance: { pathPuzzles: explicitScope },
      },
    ])
    expect(() => assertChestCapacity(plan)).toThrow(/my_journey/)
    expect(() => assertChestCapacity(plan)).toThrow(/journey\('my_journey'\)\.pyramid\('last'\)/)
  })

  it("throws when ALL pyramids are explicitly constrained and collectively insufficient", () => {
    const explicitScope = { level: "tier" as const, tier: "starter" as const }
    // All pyramids explicitly set to pathPuzzles=1 → can never auto-correct
    const plan = makePlan(Array(5).fill({ pathPuzzles: 1, provenance: { pathPuzzles: explicitScope } }))
    expect(() => assertChestCapacity(plan)).toThrow(/tier\('starter'\)/)
    expect(() => assertChestCapacity(plan)).toThrow(/pathPuzzles=1/)
  })

  it("bumps unconstrained pyramids first, leaving explicit constraint untouched", () => {
    const explicitScope = { level: "tier" as const, tier: "starter" as const }
    // Mix: one explicit (small but can't be auto-bumped), many unconstrained (can absorb capacity)
    const plan = makePlan([
      { pathPuzzles: 1, provenance: { pathPuzzles: explicitScope } },
      ...Array(20).fill({ pathPuzzles: 1, provenance: {} }),
    ])
    const result = assertChestCapacity(plan)
    // explicit pyramid stays at pathPuzzles=1
    expect(result[0].pathPuzzles).toBe(1)
    // unconstrained ones got bumped
    expect(result.slice(1).some(p => p.pathPuzzles > 1)).toBe(true)
  })
})
