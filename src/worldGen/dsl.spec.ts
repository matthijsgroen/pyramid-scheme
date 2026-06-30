import { describe, expect, it } from "vitest"
import { global, tier, journey } from "./dsl"
import { specToGate } from "./configBuilder"

// ── Constraint accumulator (.set / .sidePaths / .hiddenPaths) ─────────────────

describe("tier().set() accumulator", () => {
  it("returns a Rule with tier scope", () => {
    const r = tier("starter").set({ consumableDensity: 0 })
    expect(r.scope).toEqual({ level: "tier", tier: "starter" })
    expect(r.constraints).toMatchObject({ consumableDensity: 0 })
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
      .set({ consumableDensity: 0.05 })
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
    const r = journey("my_tomb").set({ consumableDensity: 0 })
    expect(r.scope).toEqual({ level: "journey", journey: "my_tomb" })
  })

  it("hiddenPaths().settings() with mosaic end appends correctly", () => {
    const r = journey("wizard_treasure_tomb_b")
      .set({})
      .hiddenPaths("low")
      .settings({ pathPuzzles: 1, end: "mosaic" })
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

  it("tier(name).pyramid(sel).floor(n, c) returns a tier-pyramid-floor rule", () => {
    const r = tier("expert").pyramid("last").floor(0, { difficulty: "expert" })
    expect(r.scope.level).toBe("tier-pyramid-floor")
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

  it("journey(id).pyramid(sel).floor(n, c) returns a journey-pyramid-floor rule", () => {
    const r = journey("my_tomb").pyramid("first").floor(2, { difficulty: "junior" })
    expect(r.scope.level).toBe("journey-pyramid-floor")
  })
})

// ── specToGate ────────────────────────────────────────────────────────────────

describe("specToGate", () => {
  it("null → undefined (no gate)", () => {
    expect(specToGate(null)).toBeUndefined()
  })

  it("undefined → undefined", () => {
    expect(specToGate(undefined)).toBeUndefined()
  })

  it('"floor-key" → { type: "floor-key", color: "blue" }', () => {
    expect(specToGate("floor-key")).toEqual({ type: "floor-key", color: "blue" })
  })

  it('"tomb-key" string (ambiguous) → undefined (no keyId resolvable)', () => {
    expect(specToGate("tomb-key")).toBeUndefined()
  })

  it("structured tombId resolves to wardKeyId for known tombs", () => {
    expect(specToGate({ type: "tomb-key", tombId: "expert_treasure_tomb" })).toEqual({
      type: "tomb-key",
      wardKeyId: "expert_ward",
    })
    expect(specToGate({ type: "tomb-key", tombId: "wizard_treasure_tomb_b" })).toEqual({
      type: "tomb-key",
      wardKeyId: "wizard_b_ward",
    })
  })

  it("throws for unknown tombId", () => {
    expect(() => specToGate({ type: "tomb-key", tombId: "nonexistent_tomb" })).toThrow(
      'No ward key found for tombId "nonexistent_tomb"'
    )
  })
})
