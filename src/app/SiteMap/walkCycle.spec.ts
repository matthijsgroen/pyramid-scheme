import { describe, expect, it } from "vitest"
import { stepsWalked } from "./walkCycle"

describe("the walk cycle counts distance, not time", () => {
  it("advances two steps per cell walked", () => {
    expect(stepsWalked(0)).toBe(0)
    expect(stepsWalked(0.4)).toBe(0)
    expect(stepsWalked(0.5)).toBe(1)
    expect(stepsWalked(1)).toBe(2)
    expect(stepsWalked(3.5)).toBe(7)
  })

  it("keeps counting up, so a facing takes it modulo its own frame count", () => {
    // Three frames for the side view (the sheet gave three distinct poses and three mirrors), four for
    // the others. One counter has to serve both.
    const steps = [0, 1, 2, 3, 4, 5, 6].map(s => stepsWalked(s / 2))
    expect(steps.map(s => s % 3)).toEqual([0, 1, 2, 0, 1, 2, 0])
    expect(steps.map(s => s % 4)).toEqual([0, 1, 2, 3, 0, 1, 2, 3].slice(0, 7))
  })
})
