import { describe, expect, it } from "vitest"
import { trapDamage } from "./useProgression"

describe("trapDamage", () => {
  it("deals 2 half-hearts with no armor", () => expect(trapDamage(0)).toBe(2))
  it("deals 1 half-heart with 1 armor stack", () => expect(trapDamage(1)).toBe(1))
  it("never deals less than 1 with full armor", () => expect(trapDamage(2)).toBe(1))
})
