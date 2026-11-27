// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const playSound = vi.fn()
vi.mock("@/app/audio/audio", () => ({ playSound }))

const { useLevelSounds } = await import("./useLevelSounds")

const atLevel = (levelNr: number, levelCount = 3) =>
  renderHook(({ levelNr }) => useLevelSounds(levelNr, levelCount), { initialProps: { levelNr } })

beforeEach(() => playSound.mockClear())

describe("useLevelSounds", () => {
  it("moving on to the next level plays level.complete once", () => {
    const { rerender } = atLevel(1)
    rerender({ levelNr: 2 })
    rerender({ levelNr: 2 })
    expect(playSound.mock.calls.map(([name]) => name)).toEqual(["level.complete"])
  })

  it("moving past the last level plays journey.complete instead", () => {
    const { rerender } = atLevel(3)
    rerender({ levelNr: 4 })
    expect(playSound.mock.calls.map(([name]) => name)).toEqual(["journey.complete"])
  })

  it("mounting at any level plays nothing", () => {
    atLevel(1)
    atLevel(2)
    atLevel(4)
    expect(playSound).not.toHaveBeenCalled()
  })

  it("going back to an earlier level plays nothing", () => {
    const { rerender } = atLevel(4)
    rerender({ levelNr: 1 })
    expect(playSound).not.toHaveBeenCalled()
  })
})
