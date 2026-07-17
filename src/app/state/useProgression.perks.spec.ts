import { useState } from "react"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: <T>(_key: string, initialValue: T | (() => T)) => {
    const [state, setState] = useState(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
    return [
      state,
      (value: T | ((prev: T) => T)) => {
        setState(value)
        return Promise.resolve(value)
      },
    ]
  },
}))

const { useProgression } = await import("./useProgression")

// Core owns only the corridor detector now — the other perks moved to their owning mods (trap owns
// max-health/armor/…, hieroglyph owns compass, puzzle owns scribes-eye). `perks` exposes detection
// only; bumpDetection is toLevel-bumped and capped at 4.
describe("core perks (detection only)", () => {
  it("exposes detection at its baseline", () => {
    const { result } = renderHook(() => useProgression())
    expect(result.current.perks).toEqual({ detectionLevel: 0 })
  })

  it("bumpDetection raises the level (toLevel, capped at 4)", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.bumpDetection(2))
    expect(result.current.perks.detectionLevel).toBe(2)
    // toLevel: a lower grant never lowers the current level.
    await act(async () => result.current.bumpDetection(1))
    expect(result.current.perks.detectionLevel).toBe(2)
    // capped at 4.
    await act(async () => result.current.bumpDetection(9))
    expect(result.current.perks.detectionLevel).toBe(4)
  })
})
