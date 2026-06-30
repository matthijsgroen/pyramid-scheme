import { describe, expect, it } from "vitest"
import { global, tier, journey } from "./dsl"
import { specToGate } from "./configBuilder"

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
