import { describe, expect, it } from "vitest"
import { canAttemptTrap, trapDamage } from "./useProgression"

describe("trapDamage", () => {
  it("deals 2 half-hearts with no armor", () => expect(trapDamage(0)).toBe(2))
  it("deals 1 half-heart with 1 armor stack", () => expect(trapDamage(1)).toBe(1))
  it("never deals less than 1 with full armor", () => expect(trapDamage(2)).toBe(1))
})

describe("canAttemptTrap", () => {
  it("allowed at full health (6 half-hearts)", () => expect(canAttemptTrap(6)).toBe(true))
  it("allowed at exactly 2 half-hearts — the minimum", () => expect(canAttemptTrap(2)).toBe(true))
  it("blocked at 1 half-heart — floor that must be preserved", () => expect(canAttemptTrap(1)).toBe(false))
  it("blocked at 0 health", () => expect(canAttemptTrap(0)).toBe(false))
})
