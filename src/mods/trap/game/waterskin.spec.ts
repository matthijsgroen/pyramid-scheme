import { describe, expect, it } from "vitest"
import { waterskinHeal } from "./waterskin"

describe("waterskinHeal", () => {
  it("heals one heart when hurt by one heart or more", () => {
    expect(waterskinHeal(4, 6, 0)).toBe(6)
    expect(waterskinHeal(1, 6, 0)).toBe(3)
  })

  it("heals two hearts with pack-mule", () => {
    expect(waterskinHeal(2, 8, 1)).toBe(6)
  })

  it("never heals above the maximum", () => {
    expect(waterskinHeal(5, 6, 0)).toBe(6)
    expect(waterskinHeal(5, 6, 1)).toBe(6)
  })

  it("leaves full health unchanged", () => {
    expect(waterskinHeal(6, 6, 0)).toBe(6)
    expect(waterskinHeal(6, 6, 1)).toBe(6)
  })
})
