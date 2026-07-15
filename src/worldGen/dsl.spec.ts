import { describe, expect, it } from "vitest"
import { global, tier, journey, resolveNodeSelectors } from "./dsl"

// ── Node selectors → per-index encounter overrides (§G) ───────────────────────

describe("resolveNodeSelectors", () => {
  it("resolves first/last/nth to 0-based indices (1-based authoring)", () => {
    expect(resolveNodeSelectors([{ where: "first", encounter: "a" }], 4)).toEqual({ 0: "a" })
    expect(resolveNodeSelectors([{ where: "last", encounter: "capstone" }], 4)).toEqual({ 3: "capstone" })
    expect(resolveNodeSelectors([{ where: 2, encounter: "b" }], 4)).toEqual({ 1: "b" })
  })

  it("every-k selects every k-th node from an optional 1-based start", () => {
    expect(resolveNodeSelectors([{ where: { every: 3 }, encounter: "trap" }], 7)).toEqual({
      0: "trap",
      3: "trap",
      6: "trap",
    })
    expect(resolveNodeSelectors([{ where: { every: 2, from: 2 }, encounter: "trap" }], 5)).toEqual({
      1: "trap",
      3: "trap",
    })
  })

  it("drops out-of-range positions and later selectors win on overlap", () => {
    expect(resolveNodeSelectors([{ where: 9, encounter: "x" }], 3)).toEqual({})
    expect(
      resolveNodeSelectors(
        [
          { where: { every: 1 }, encounter: "trap" },
          { where: "last", encounter: "capstone" },
        ],
        3
      )
    ).toEqual({ 0: "trap", 1: "trap", 2: "capstone" })
  })

  it("empty for no selectors or a zero-length path", () => {
    expect(resolveNodeSelectors(undefined, 4)).toEqual({})
    expect(resolveNodeSelectors([{ where: "last", encounter: "a" }], 0)).toEqual({})
  })
})

// ── Constraint accumulator (.set / .sidePaths / .hiddenPaths) ─────────────────

describe("tier().set() accumulator", () => {
  it("returns a Rule with tier scope", () => {
    const r = tier("starter").set({ corridorStraightness: 0.5 })
    expect(r.scope).toEqual({ level: "tier", tier: "starter" })
    expect(r.constraints).toMatchObject({ corridorStraightness: 0.5 })
  })

  it("sidePaths().settings() appends to constraints.sidePaths", () => {
    const r = tier("starter").set({}).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" })
    expect(r.constraints.sidePaths).toEqual([{ density: "low", pathPuzzles: 0, end: "fragment" }])
  })

  it("hiddenPaths().settings() appends to constraints.hiddenPaths", () => {
    const r = tier("starter").set({}).hiddenPaths("low").settings({ pathPuzzles: 0, end: "treasure" })
    expect(r.constraints.hiddenPaths).toEqual([{ density: "low", pathPuzzles: 0, end: "treasure" }])
  })

  it("multiple sidePaths calls stack in order", () => {
    const r = tier("junior")
      .set({})
      .sidePaths("low")
      .settings({ pathPuzzles: 0, end: "treasure" })
      .sidePaths("medium")
      .settings({ pathPuzzles: 1, end: "fragment" })
    expect(r.constraints.sidePaths).toEqual([
      { density: "low", pathPuzzles: 0, end: "treasure" },
      { density: "medium", pathPuzzles: 1, end: "fragment" },
    ])
  })

  it("multiple hiddenPaths calls stack in order", () => {
    const r = tier("wizard")
      .set({})
      .hiddenPaths("medium")
      .settings({ pathPuzzles: 0, end: "treasure" })
      .hiddenPaths("low")
      .settings({ pathPuzzles: 1, end: "mosaic" })
    expect(r.constraints.hiddenPaths).toEqual([
      { density: "medium", pathPuzzles: 0, end: "treasure" },
      { density: "low", pathPuzzles: 1, end: "mosaic" },
    ])
  })

  it("two sidePaths at the same density with different settings both stack", () => {
    const r = tier("wizard")
      .set({})
      .sidePaths("low")
      .settings({ pathPuzzles: 0, end: "treasure" })
      .sidePaths("low")
      .settings({ pathPuzzles: 1, end: "fragment" })
    expect(r.constraints.sidePaths).toEqual([
      { density: "low", pathPuzzles: 0, end: "treasure" },
      { density: "low", pathPuzzles: 1, end: "fragment" },
    ])
  })

  it("two hiddenPaths at the same density with different settings both stack", () => {
    const r = tier("wizard")
      .set({})
      .hiddenPaths("low")
      .settings({ pathPuzzles: 0, end: "treasure" })
      .hiddenPaths("low")
      .settings({ pathPuzzles: 1, end: "treasure" })
    expect(r.constraints.hiddenPaths).toEqual([
      { density: "low", pathPuzzles: 0, end: "treasure" },
      { density: "low", pathPuzzles: 1, end: "treasure" },
    ])
  })

  it("sidePaths and hiddenPaths coexist independently", () => {
    const r = tier("expert")
      .set({})
      .sidePaths("low")
      .settings({ pathPuzzles: 0, end: "treasure" })
      .hiddenPaths("low")
      .settings({ pathPuzzles: 0, end: "treasure" })
    expect(r.constraints.sidePaths).toHaveLength(1)
    expect(r.constraints.hiddenPaths).toHaveLength(1)
  })

  it("does not mutate caller's sidePaths array passed to set()", () => {
    const input = { sidePaths: [{ density: "low" as const, pathPuzzles: 0, end: "fragment" as const }] }
    const acc = tier("starter").set(input)
    acc.sidePaths("medium").settings({ pathPuzzles: 1, end: "fragment" })
    expect(input.sidePaths).toHaveLength(1)
  })

  it("does not mutate caller's hiddenPaths array passed to set()", () => {
    const input = { hiddenPaths: [{ density: "low" as const, pathPuzzles: 0, end: "treasure" as const }] }
    const acc = tier("master").set(input)
    acc.hiddenPaths("medium").settings({ pathPuzzles: 0, end: "treasure" })
    expect(input.hiddenPaths).toHaveLength(1)
  })
})

describe("journey().set() accumulator", () => {
  it("returns a Rule with journey scope", () => {
    const r = journey("my_tomb").set({})
    expect(r.scope).toEqual({ level: "journey", journey: "my_tomb" })
  })

  it("hiddenPaths().settings() with mosaic end appends correctly", () => {
    const r = journey("wizard_treasure_tomb_b").set({}).hiddenPaths("low").settings({ pathPuzzles: 1, end: "mosaic" })
    expect(r.constraints.hiddenPaths).toEqual([{ density: "low", pathPuzzles: 1, end: "mosaic" }])
  })
})

// ── DSL builder API ───────────────────────────────────────────────────────────

describe("global() builder", () => {
  it("global(c) returns a pyramid-level rule", () => {
    const r = global({ difficulty: "starter" })
    expect(r.scope.level).toBe("global")
    expect(r.constraints).toEqual({ difficulty: "starter" })
  })

  it("global().floor(n, c) returns a floor-scoped rule", () => {
    const r = global().floor(2, { difficulty: "junior" })
    expect(r.scope.level).toBe("global-floor")
    expect((r.scope as { floor: number }).floor).toBe(2)
    expect(r.constraints).toEqual({ difficulty: "junior" })
  })
})

describe("tier() builder", () => {
  it("tier(name, c) returns a pyramid-level rule", () => {
    const r = tier("starter", { difficulty: "starter" })
    expect(r.scope.level).toBe("tier")
  })

  it("tier(name).floor(n, c) returns a tier-floor rule", () => {
    const r = tier("junior").floor(1, { difficulty: "expert" })
    expect(r.scope.level).toBe("tier-floor")
    expect((r.scope as { tier: string; floor: number }).tier).toBe("junior")
    expect((r.scope as { tier: string; floor: number }).floor).toBe(1)
  })

  it("tier(name).pyramid(sel, c) returns a tier-pyramid rule", () => {
    const r = tier("expert").pyramid("last", { difficulty: "expert" })
    expect(r.scope.level).toBe("tier-pyramid")
  })

  it("tier(name).pyramid(n).floor(a, c).floor(b, c) chains floors into one tier-pyramid rule", () => {
    const r = tier("expert").pyramid(2).floor(0, { difficulty: "expert" }).floor(1, { difficulty: "master" })
    expect(r.scope.level).toBe("tier-pyramid")
    const floors = (r.constraints as { floors?: unknown[] }).floors
    expect(floors?.[0]).toEqual({ difficulty: "expert" })
    expect(floors?.[1]).toEqual({ difficulty: "master" })
  })
})

describe("journey() builder", () => {
  it("journey(id, c) returns a pyramid-level rule", () => {
    const r = journey("my_tomb", { difficulty: "junior" })
    expect(r.scope.level).toBe("journey")
  })

  it("journey(id).floor(n, c) returns a journey-floor rule", () => {
    const r = journey("my_tomb").floor(0, { difficulty: "expert" })
    expect(r.scope.level).toBe("journey-floor")
    expect((r.scope as { journey: string; floor: number }).journey).toBe("my_tomb")
    expect((r.scope as { journey: string; floor: number }).floor).toBe(0)
  })

  it("journey(id).pyramid(n).floor(a, c) returns a journey-pyramid rule with a floors array", () => {
    const r = journey("my_tomb").pyramid(1).floor(2, { difficulty: "junior" })
    expect(r.scope.level).toBe("journey-pyramid")
    const floors = (r.constraints as { floors?: unknown[] }).floors
    expect(floors?.[2]).toEqual({ difficulty: "junior" })
  })
})

// ── encounter + junk PathEntry ───────────────────────────────────────────────────

describe("PathEntry encounter field", () => {
  it("sidePaths().settings() with encounter propagates to constraints", () => {
    const r = tier("expert").set({}).sidePaths("low").settings({ pathPuzzles: 1, end: "junk", encounter: "trap" })
    expect(r.constraints.sidePaths).toEqual([{ density: "low", pathPuzzles: 1, end: "junk", encounter: "trap" }])
  })

  it("hiddenPaths().settings() with encounter propagates to constraints", () => {
    const r = tier("expert").set({}).hiddenPaths("low").settings({ pathPuzzles: 1, end: "treasure", encounter: "trap" })
    expect(r.constraints.hiddenPaths).toEqual([{ density: "low", pathPuzzles: 1, end: "treasure", encounter: "trap" }])
  })

  it("settings() without encounter does not add the key", () => {
    const r = tier("starter").set({}).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" })
    expect(r.constraints.sidePaths![0]).not.toHaveProperty("encounter")
  })

  it("junk PathEndHint accepted by sidePaths", () => {
    const r = tier("expert").set({}).sidePaths("medium").settings({ pathPuzzles: 1, end: "junk" })
    expect(r.constraints.sidePaths![0].end).toBe("junk")
  })

  it("encounter entry stacks alongside plain entries", () => {
    const r = tier("master")
      .set({})
      .sidePaths("medium")
      .settings({ pathPuzzles: 1, end: "fragment" })
      .sidePaths("low")
      .settings({ pathPuzzles: 1, end: "junk", encounter: "trap" })
    expect(r.constraints.sidePaths).toHaveLength(2)
    expect(r.constraints.sidePaths![0].encounter).toBeUndefined()
    expect(r.constraints.sidePaths![1].encounter).toBe("trap")
  })
})
