import { describe, expect, it } from "vitest"
import { JOURNEY_COMPLETE, LEVEL_COMPLETE, motif, scaleFrequency, WRONG_TONE } from "./tones"
import type { Tone } from "./soundRegistry"

const lastEnd = (tones: readonly Tone[]) => Math.max(...tones.map(tone => tone.start + tone.duration))
const semitonesApart = (a: number, b: number) => Math.abs(12 * Math.log2(a / b))

describe("tones", () => {
  it("each step of the scale is higher than the one before, across two octaves", () => {
    for (let step = 1; step <= 13; step++) {
      expect(scaleFrequency(step)).toBeGreaterThan(scaleFrequency(step - 1))
    }
  })

  it("starts the scale on D4", () => {
    expect(scaleFrequency(0)).toBeCloseTo(293.66, 1)
  })

  it("climbs one octave every seven steps", () => {
    expect(scaleFrequency(7)).toBeCloseTo(scaleFrequency(0) * 2, 5)
    expect(scaleFrequency(-7)).toBeCloseTo(scaleFrequency(0) / 2, 5)
  })

  it("the wrong tone is none of the scale's notes", () => {
    const scale = Array.from({ length: 42 }, (_, i) => scaleFrequency(i - 21))
    for (const tone of WRONG_TONE({})) {
      for (const note of scale) expect(semitonesApart(tone.frequency, note)).toBeGreaterThan(0.25)
    }
  })

  it("a motif plays its scale steps in turn", () => {
    const tones = motif([0, 4, 2])({})
    expect(tones.map(tone => tone.frequency)).toEqual([scaleFrequency(0), scaleFrequency(4), scaleFrequency(2)])
    expect(tones[1].start).toBeGreaterThan(tones[0].start)
    expect(tones[2].start).toBeGreaterThan(tones[1].start)
  })

  it("the journey phrase is bigger than the level phrase", () => {
    const level = LEVEL_COMPLETE({})
    const journey = JOURNEY_COMPLETE({})
    expect(journey.length).toBeGreaterThan(level.length)
    expect(lastEnd(journey)).toBeGreaterThan(lastEnd(level))
  })
})
