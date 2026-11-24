import { describe, expect, it } from "vitest"
import { scaleRate, scaleSemitones } from "./scale"

describe("the sequence scale", () => {
  it("plays the first step at the sample's own pitch", () => {
    expect(scaleRate(0)).toBe(1)
  })

  it("each step of the scale is higher than the one before, across two octaves", () => {
    for (let step = 1; step <= 13; step++) expect(scaleRate(step)).toBeGreaterThan(scaleRate(step - 1))
  })

  it("walks D Hijaz: a half step, then a step and a half", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(scaleSemitones)).toEqual([0, 1, 4, 5, 7, 8, 10])
  })

  it("climbs one octave every seven steps", () => {
    expect(scaleRate(7)).toBeCloseTo(2, 10)
    expect(scaleRate(14)).toBeCloseTo(4, 10)
  })
})
