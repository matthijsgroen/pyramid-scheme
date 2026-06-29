import { describe, expect, it } from "vitest"
import {
  resolvePyramidConstraint,
  resolveFloorConstraint,
  resolvePyramidConstraintWithProvenance,
  describeScope,
} from "./constraintResolver"
import { global, tier, journey, rules } from "./dsl"
import type { Rule } from "./dsl"

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolve = (ruleList: Rule[], journeyId: string, pyramidIndex: number, levelCount: number) =>
  resolvePyramidConstraint(ruleList, journeyId, "starter", pyramidIndex, levelCount)

// ── Selector matching (via resolvePyramidConstraint) ──────────────────────────

describe("pyramid selector matching", () => {
  it("matches 'first' → index 0", () => {
    const r = rules([tier("starter").pyramid("first", { difficulty: "starter" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("starter")
    expect(resolve(r, "j1", 1, 3).difficulty).toBeUndefined()
  })

  it("matches 'last' → last index", () => {
    const r = rules([tier("starter").pyramid("last", { difficulty: "expert" })])
    expect(resolve(r, "j1", 2, 3).difficulty).toBe("expert")
    expect(resolve(r, "j1", 0, 3).difficulty).toBeUndefined()
  })

  it("matches 'middle' → floor(levelCount/2)", () => {
    const r = rules([tier("starter").pyramid("middle", { difficulty: "junior" })])
    // levelCount=5 → middle=2
    expect(resolve(r, "j1", 2, 5).difficulty).toBe("junior")
    expect(resolve(r, "j1", 1, 5).difficulty).toBeUndefined()
  })

  it("matches 'last-N' → levelCount-1-N", () => {
    const r = rules([tier("starter").pyramid("last-1", { difficulty: "expert" })])
    // levelCount=4 → last-1 = index 2
    expect(resolve(r, "j1", 2, 4).difficulty).toBe("expert")
    expect(resolve(r, "j1", 3, 4).difficulty).toBeUndefined()
  })

  it("matches numeric selector (1-based)", () => {
    const r = rules([tier("starter").pyramid(2, { difficulty: "junior" })])
    expect(resolve(r, "j1", 1, 4).difficulty).toBe("junior")
    expect(resolve(r, "j1", 0, 4).difficulty).toBeUndefined()
  })

  it("matches range selector (1-based, inclusive)", () => {
    const r = rules([tier("starter").pyramid("2-4", { difficulty: "expert" })])
    expect(resolve(r, "j1", 1, 5).difficulty).toBe("expert") // index 1 = pyramid 2
    expect(resolve(r, "j1", 3, 5).difficulty).toBe("expert") // index 3 = pyramid 4
    expect(resolve(r, "j1", 0, 5).difficulty).toBeUndefined()
    expect(resolve(r, "j1", 4, 5).difficulty).toBeUndefined()
  })
})

// ── Specificity cascade ───────────────────────────────────────────────────────

describe("specificity cascade", () => {
  it("pyramid-level overrides tier-level overrides global", () => {
    const r = rules([
      global({ difficulty: "starter" }),
      tier("starter", { difficulty: "junior" }),
      tier("starter").pyramid("first", { difficulty: "expert" }),
    ])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("expert")
    expect(resolve(r, "j1", 1, 3).difficulty).toBe("junior")
  })

  it("journey-pyramid overrides tier-pyramid at same specificity (later wins)", () => {
    const r = rules([
      tier("starter").pyramid("first", { difficulty: "junior" }),
      journey("j1").pyramid("first", { difficulty: "expert" }),
    ])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("expert")
  })

  it("merges non-conflicting fields from multiple rules", () => {
    const r = rules([
      global({ floorDepth: 1 }),
      tier("starter", { difficulty: "starter" }),
      tier("starter").pyramid("last", { mainEndReward: "mosaicPiece" }),
    ])
    const last = resolve(r, "j1", 2, 3)
    expect(last.floorDepth).toBe(1)
    expect(last.difficulty).toBe("starter")
    expect(last.mainEndReward).toBe("mosaicPiece")
  })

  it("journey scope overrides tier scope at same level (later wins)", () => {
    const r = rules([tier("starter", { difficulty: "starter" }), journey("j1", { difficulty: "expert" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("expert")
    // different journey → tier rule applies
    expect(resolve(r, "j2", 0, 3).difficulty).toBe("starter")
  })

  it("does not match tier rule to wrong tier", () => {
    const r = rules([tier("junior", { difficulty: "starter" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBeUndefined()
  })
})

// ── Validation (full set) ─────────────────────────────────────────────────────

describe("constraint validation errors", () => {
  it("throws when minFloors > maxFloors", () => {
    const r = rules([global({ minFloors: 5, maxFloors: 3 })])
    expect(() => resolve(r, "j1", 0, 3)).toThrow("minFloors")
  })

  it("throws when floorDepth > maxFloors", () => {
    const r = rules([global({ floorDepth: 4, maxFloors: 2 })])
    expect(() => resolve(r, "j1", 0, 3)).toThrow("floorDepth")
  })

  it("throws when floorDepth < minFloors", () => {
    const r = rules([global({ floorDepth: 1, minFloors: 3 })])
    expect(() => resolve(r, "j1", 0, 3)).toThrow("floorDepth")
  })

  it("does not throw when floorDepth is within min/max range", () => {
    const r = rules([global({ floorDepth: 2, minFloors: 1, maxFloors: 3 })])
    expect(() => resolve(r, "j1", 0, 3)).not.toThrow()
  })
})

// ── resolveFloorConstraint ────────────────────────────────────────────────────

const resolveFloor = (
  ruleList: Rule[],
  pyramidIndex: number,
  levelCount: number,
  floorIndex: number,
  journeyId = "j1"
) => resolveFloorConstraint(ruleList, {}, journeyId, "starter", pyramidIndex, levelCount, floorIndex)

describe("resolveFloorConstraint", () => {
  it("falls back to pyramid floors[] array entry", () => {
    const pyramidC = { floors: [{ difficulty: "expert" as const }, null] }
    const result = resolveFloorConstraint([], pyramidC, "j1", "starter", 0, 3, 0)
    expect(result.difficulty).toBe("expert")
  })

  it("explicit floor-scope rule overrides floors[] entry", () => {
    const pyramidC = { floors: [{ difficulty: "starter" as const }] }
    const r = rules([journey("j1").pyramid("first").floor(0, { difficulty: "junior" })])
    const result = resolveFloorConstraint(r, pyramidC, "j1", "starter", 0, 3, 0)
    expect(result.difficulty).toBe("junior")
  })

  it("returns empty object when no rules or floors[] entry", () => {
    const result = resolveFloorConstraint([], {}, "j1", "starter", 0, 3, 0)
    expect(result).toEqual({})
  })

  it("global-floor applies to all pyramids at that floor index", () => {
    const r = rules([global().floor(0, { difficulty: "starter" })])
    expect(resolveFloor(r, 0, 3, 0).difficulty).toBe("starter") // pyramid 1, floor 0
    expect(resolveFloor(r, 2, 3, 0).difficulty).toBe("starter") // pyramid 3, floor 0
    expect(resolveFloor(r, 0, 3, 1).difficulty).toBeUndefined() // floor 1 → no match
  })

  it("tier-floor applies to matching tier at that floor index", () => {
    const r = rules([tier("starter").floor(1, { difficulty: "junior" })])
    expect(resolveFloor(r, 0, 3, 1).difficulty).toBe("junior")
    expect(resolveFloor(r, 0, 3, 0).difficulty).toBeUndefined() // wrong floor
    // wrong tier
    const result = resolveFloorConstraint(r, {}, "j1", "junior", 0, 3, 1)
    expect(result.difficulty).toBeUndefined()
  })

  it("journey-floor applies to matching journey at that floor index", () => {
    const r = rules([journey("j1").floor(0, { difficulty: "expert" })])
    expect(resolveFloor(r, 0, 3, 0, "j1").difficulty).toBe("expert")
    expect(resolveFloor(r, 0, 3, 0, "j2").difficulty).toBeUndefined() // wrong journey
  })

  it("floor-scope specificity: journey-floor > tier-floor > global-floor", () => {
    const r = rules([
      global().floor(0, { difficulty: "starter" }),
      tier("starter").floor(0, { difficulty: "junior" }),
      journey("j1").floor(0, { difficulty: "expert" }),
    ])
    expect(resolveFloor(r, 0, 3, 0).difficulty).toBe("expert")
    // remove journey rule → tier-floor wins
    const r2 = rules([global().floor(0, { difficulty: "starter" }), tier("starter").floor(0, { difficulty: "junior" })])
    expect(resolveFloor(r2, 0, 3, 0).difficulty).toBe("junior")
  })

  it("journey-pyramid-floor > journey-floor > tier-pyramid-floor > tier-floor", () => {
    const r = rules([
      tier("starter").floor(0, { difficulty: "starter" }),
      tier("starter").pyramid("first").floor(0, { difficulty: "junior" }),
      journey("j1").floor(0, { difficulty: "expert" }),
      journey("j1").pyramid("first").floor(0, { difficulty: "expert" }),
    ])
    // journey-pyramid-floor (rank 9) wins
    expect(resolveFloor(r, 0, 3, 0).difficulty).toBe("expert")
  })

  it("floor-scope rules do not bleed into pyramid resolution", () => {
    const r = rules([global().floor(0, { difficulty: "expert" })])
    // pyramid resolution should not pick up floor-scoped rules
    expect(resolve(r, "j1", 0, 3).difficulty).toBeUndefined()
  })
})

// ── Specificity ordering (updated ranks) ──────────────────────────────────────

describe("specificity ordering", () => {
  it("journey (rank 4) beats tier (rank 2) at pyramid level", () => {
    const r = rules([tier("starter", { difficulty: "starter" }), journey("j1", { difficulty: "expert" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("expert")
  })

  it("tier (rank 2) applies when no journey rule matches", () => {
    const r = rules([tier("starter", { difficulty: "starter" }), journey("j2", { difficulty: "expert" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("starter")
  })

  it("journey-pyramid (rank 8) beats tier-pyramid (rank 6)", () => {
    const r = rules([
      tier("starter").pyramid("first", { difficulty: "starter" }),
      journey("j1").pyramid("first", { difficulty: "expert" }),
    ])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("expert")
  })
})

// ── Provenance tracking ───────────────────────────────────────────────────────

describe(resolvePyramidConstraintWithProvenance, () => {
  it("returns empty provenance when no rules match", () => {
    const { provenance } = resolvePyramidConstraintWithProvenance([], "j1", "starter", 0, 1)
    expect(Object.keys(provenance)).toHaveLength(0)
  })

  it("attributes field to the matching rule scope", () => {
    const r = rules([tier("expert", { pathPuzzles: 3 })])
    const { constraint, provenance } = resolvePyramidConstraintWithProvenance(r, "j1", "expert", 0, 1)
    expect(constraint.pathPuzzles).toBe(3)
    expect(provenance.pathPuzzles).toEqual({ level: "tier", tier: "expert" })
  })

  it("higher specificity rule wins — provenance reflects winner", () => {
    const r = rules([tier("expert", { pathPuzzles: 3 }), journey("j1", { pathPuzzles: 5 })])
    const { constraint, provenance } = resolvePyramidConstraintWithProvenance(r, "j1", "expert", 0, 1)
    expect(constraint.pathPuzzles).toBe(5)
    expect(provenance.pathPuzzles).toEqual({ level: "journey", journey: "j1" })
  })

  it("tracks each field independently", () => {
    const r = rules([tier("expert", { pathPuzzles: 3, difficulty: "expert" }), journey("j1", { pathPuzzles: 5 })])
    const { provenance } = resolvePyramidConstraintWithProvenance(r, "j1", "expert", 0, 1)
    expect(provenance.pathPuzzles).toEqual({ level: "journey", journey: "j1" })
    expect(provenance.difficulty).toEqual({ level: "tier", tier: "expert" })
  })

  it("non-matching rules leave no provenance", () => {
    const r = rules([tier("expert", { pathPuzzles: 3 })])
    const { provenance } = resolvePyramidConstraintWithProvenance(r, "j1", "starter", 0, 1)
    expect(provenance.pathPuzzles).toBeUndefined()
  })
})

describe(describeScope, () => {
  it("formats global scope", () => expect(describeScope({ level: "global" })).toBe("global"))
  it("formats tier scope", () => expect(describeScope({ level: "tier", tier: "expert" })).toBe("tier('expert')"))
  it("formats journey scope", () => expect(describeScope({ level: "journey", journey: "j1" })).toBe("journey('j1')"))
  it("formats tier-pyramid scope", () =>
    expect(describeScope({ level: "tier-pyramid", tier: "expert", pyramid: "last" })).toBe(
      "tier('expert').pyramid('last')"
    ))
  it("formats journey-pyramid scope", () =>
    expect(describeScope({ level: "journey-pyramid", journey: "j1", pyramid: "first" })).toBe(
      "journey('j1').pyramid('first')"
    ))
  it("formats floor scopes", () => {
    expect(describeScope({ level: "global-floor", floor: 2 })).toBe("global.floor(2)")
    expect(describeScope({ level: "tier-floor", tier: "expert", floor: 1 })).toBe("tier('expert').floor(1)")
    expect(describeScope({ level: "journey-pyramid-floor", journey: "j1", pyramid: "last", floor: 0 })).toBe(
      "journey('j1').pyramid('last').floor(0)"
    )
  })
})
