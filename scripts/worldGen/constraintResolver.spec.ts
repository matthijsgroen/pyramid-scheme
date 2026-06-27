import { describe, expect, it } from "vitest"
import { resolvePyramidConstraint, resolveFloorConstraint } from "./constraintResolver"
import { global, tier, journey, rules } from "./dsl"
import type { Rule } from "./dsl"

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolve = (ruleList: Rule[], journeyId: string, pyramidIndex: number, levelCount: number) =>
  resolvePyramidConstraint(ruleList, journeyId, "starter", pyramidIndex, levelCount)

// ── Selector matching (via resolvePyramidConstraint) ──────────────────────────

describe("pyramid selector matching", () => {
  it("matches 'first' → index 0", () => {
    const r = rules([tier("starter").pyramid("first", { difficulty: "easy" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("easy")
    expect(resolve(r, "j1", 1, 3).difficulty).toBeUndefined()
  })

  it("matches 'last' → last index", () => {
    const r = rules([tier("starter").pyramid("last", { difficulty: "hard" })])
    expect(resolve(r, "j1", 2, 3).difficulty).toBe("hard")
    expect(resolve(r, "j1", 0, 3).difficulty).toBeUndefined()
  })

  it("matches 'middle' → floor(levelCount/2)", () => {
    const r = rules([tier("starter").pyramid("middle", { difficulty: "medium" })])
    // levelCount=5 → middle=2
    expect(resolve(r, "j1", 2, 5).difficulty).toBe("medium")
    expect(resolve(r, "j1", 1, 5).difficulty).toBeUndefined()
  })

  it("matches 'last-N' → levelCount-1-N", () => {
    const r = rules([tier("starter").pyramid("last-1", { difficulty: "hard" })])
    // levelCount=4 → last-1 = index 2
    expect(resolve(r, "j1", 2, 4).difficulty).toBe("hard")
    expect(resolve(r, "j1", 3, 4).difficulty).toBeUndefined()
  })

  it("matches numeric selector (1-based)", () => {
    const r = rules([tier("starter").pyramid(2, { difficulty: "medium" })])
    expect(resolve(r, "j1", 1, 4).difficulty).toBe("medium")
    expect(resolve(r, "j1", 0, 4).difficulty).toBeUndefined()
  })

  it("matches range selector (1-based, inclusive)", () => {
    const r = rules([tier("starter").pyramid("2-4", { difficulty: "hard" })])
    expect(resolve(r, "j1", 1, 5).difficulty).toBe("hard") // index 1 = pyramid 2
    expect(resolve(r, "j1", 3, 5).difficulty).toBe("hard") // index 3 = pyramid 4
    expect(resolve(r, "j1", 0, 5).difficulty).toBeUndefined()
    expect(resolve(r, "j1", 4, 5).difficulty).toBeUndefined()
  })
})

// ── Specificity cascade ───────────────────────────────────────────────────────

describe("specificity cascade", () => {
  it("pyramid-level overrides tier-level overrides global", () => {
    const r = rules([
      global({ difficulty: "easy" }),
      tier("starter", { difficulty: "medium" }),
      tier("starter").pyramid("first", { difficulty: "hard" }),
    ])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("hard")
    expect(resolve(r, "j1", 1, 3).difficulty).toBe("medium")
  })

  it("journey-pyramid overrides tier-pyramid at same specificity (later wins)", () => {
    const r = rules([
      tier("starter").pyramid("first", { difficulty: "medium" }),
      journey("j1").pyramid("first", { difficulty: "hard" }),
    ])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("hard")
  })

  it("merges non-conflicting fields from multiple rules", () => {
    const r = rules([
      global({ floorDepth: 1 }),
      tier("starter", { difficulty: "easy" }),
      tier("starter").pyramid("last", { mainEndReward: "mosaicPiece" }),
    ])
    const last = resolve(r, "j1", 2, 3)
    expect(last.floorDepth).toBe(1)
    expect(last.difficulty).toBe("easy")
    expect(last.mainEndReward).toBe("mosaicPiece")
  })

  it("journey scope overrides tier scope at same level (later wins)", () => {
    const r = rules([tier("starter", { difficulty: "easy" }), journey("j1", { difficulty: "hard" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBe("hard")
    // different journey → tier rule applies
    expect(resolve(r, "j2", 0, 3).difficulty).toBe("easy")
  })

  it("does not match tier rule to wrong tier", () => {
    const r = rules([tier("junior", { difficulty: "easy" })])
    expect(resolve(r, "j1", 0, 3).difficulty).toBeUndefined()
  })
})

// ── Validation ────────────────────────────────────────────────────────────────

describe("constraint validation", () => {
  it("throws when minFloors > maxFloors", () => {
    const r = rules([global({ minFloors: 5, maxFloors: 3 })])
    expect(() => resolve(r, "j1", 0, 3)).toThrow("minFloors")
  })
})

// ── resolveFloorConstraint ────────────────────────────────────────────────────

describe("resolveFloorConstraint", () => {
  it("falls back to pyramid floors[] array entry", () => {
    const pyramidC = { floors: [{ difficulty: "hard" as const }, null] }
    const result = resolveFloorConstraint([], pyramidC, "j1", "starter", 0, 3, 0)
    expect(result.difficulty).toBe("hard")
  })

  it("explicit floor-scope rule overrides floors[] entry", () => {
    const pyramidC = { floors: [{ difficulty: "easy" as const }] }
    const r = rules([journey("j1").pyramid("first").floor(0, { difficulty: "medium" })])
    const result = resolveFloorConstraint(r, pyramidC, "j1", "starter", 0, 3, 0)
    expect(result.difficulty).toBe("medium")
  })

  it("returns empty object when no rules or floors[] entry", () => {
    const result = resolveFloorConstraint([], {}, "j1", "starter", 0, 3, 0)
    expect(result).toEqual({})
  })
})
