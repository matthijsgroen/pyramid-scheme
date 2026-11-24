import { beforeEach, describe, expect, it, vi } from "vitest"

const playSound = vi.fn()
vi.mock("@/app/audio/audio", () => ({ playSound }))

const { playWalkCues, sequenceCue } = await import("./sequenceSounds")
const { scaleRate } = await import("@/app/audio/scale")

beforeEach(() => playSound.mockClear())

describe("sequenceCue", () => {
  it("the third tile walked in order pitches the step sample to the third note of the scale", () => {
    expect(sequenceCue("3")).toEqual({ name: "sequence.step", options: { playbackRate: scaleRate(2) } })
  })

  it("a tile walked out of order plays the wrong tone", () => {
    expect(sequenceCue("x1.3")?.name).toBe("sequence.wrong")
  })

  it("after the reset the first tile starts the scale again", () => {
    expect(sequenceCue("0")).toBeUndefined()
    expect(sequenceCue("1")?.options?.playbackRate).toBe(1)
  })
})

describe("playWalkCues", () => {
  it("walking across two due tiles plays two rising notes, the second scheduled later", () => {
    const presses = [
      { state: "1", at: [2, 3] as const },
      { state: "2", at: [2, 6] as const },
    ]
    playWalkCues(presses, (_r, c) => c * 100)
    expect(playSound).toHaveBeenCalledTimes(2)
    const [[first, a], [second, b]] = playSound.mock.calls
    expect([first, second]).toEqual(["sequence.step", "sequence.step"])
    expect(b.playbackRate).toBeGreaterThan(a.playbackRate)
    expect(b.delay).toBeGreaterThan(a.delay)
  })
})
