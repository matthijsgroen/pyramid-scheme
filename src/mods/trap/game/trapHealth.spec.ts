import { describe, expect, it } from "vitest"
import { isTrapAttemptSafe, trapDamage } from "./trapHealth"

describe("trapDamage", () => {
  it("deals 2 half-hearts with no armor", () => expect(trapDamage(0)).toBe(2))
  it("deals 1 half-heart with 1 armor stack", () => expect(trapDamage(1)).toBe(1))
  it("never deals less than 1 with full armor", () => expect(trapDamage(2)).toBe(1))
})

// Soft gating (§G): a trap always launches; this only flags whether a failed attempt is
// survivable-with-buffer, driving a risk warning — it never blocks the attempt.
describe("isTrapAttemptSafe", () => {
  it("safe at full health (6 half-hearts)", () => expect(isTrapAttemptSafe(6)).toBe(true))
  it("safe at exactly 2 half-hearts (a fail lands at 0, not below)", () => expect(isTrapAttemptSafe(2)).toBe(true))
  it("risky at 1 half-heart — warn, but still attemptable", () => expect(isTrapAttemptSafe(1)).toBe(false))
  it("risky at 0 health", () => expect(isTrapAttemptSafe(0)).toBe(false))
})
