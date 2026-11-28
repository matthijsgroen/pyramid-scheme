import { afterEach, describe, expect, it, vi } from "vitest"
import { playOpeningSound } from "./openingSound"

const playSound = vi.hoisted(() => vi.fn())
vi.mock("@/app/audio/audio", () => ({ playSound }))

const at = (ms: number) => vi.spyOn(performance, "now").mockReturnValue(ms)

afterEach(() => vi.restoreAllMocks())

describe("the opening sound", () => {
  it("plays once for a door and its corridor opening together, and again for the next opening", () => {
    at(10_000)
    playOpeningSound()
    playOpeningSound()
    at(20_000)
    playOpeningSound()
    expect(playSound).toHaveBeenCalledTimes(2)
  })
})
