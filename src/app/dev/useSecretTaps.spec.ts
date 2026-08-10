import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS, useSecretTaps } from "./useSecretTaps"

// A controllable clock rather than real timers: the whole point of the gesture is what happens
// across specific gaps, and fake time makes those exact instead of flaky.
const clock = (start = 1000) => {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

const tapTimes = (result: { current: { tap: () => void } }, times: number) => {
  for (let i = 0; i < times; i++) act(() => result.current.tap())
}

describe("useSecretTaps", () => {
  it("unlocks on the seventh tap, not before", () => {
    const onUnlock = vi.fn()
    const { now } = clock()
    const { result } = renderHook(() => useSecretTaps(onUnlock, now))

    tapTimes(result, SECRET_TAP_COUNT - 1)
    expect(onUnlock).not.toHaveBeenCalled()

    act(() => result.current.tap())
    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it("counts down the taps still needed", () => {
    const { now } = clock()
    const { result } = renderHook(() => useSecretTaps(vi.fn(), now))

    act(() => result.current.tap())
    expect(result.current.remaining).toBe(SECRET_TAP_COUNT - 1)
    act(() => result.current.tap())
    expect(result.current.remaining).toBe(SECRET_TAP_COUNT - 2)
  })

  it("abandons a half-finished sequence after the window lapses", () => {
    const onUnlock = vi.fn()
    const { now, advance } = clock()
    const { result } = renderHook(() => useSecretTaps(onUnlock, now))

    tapTimes(result, SECRET_TAP_COUNT - 1)
    advance(SECRET_TAP_WINDOW_MS + 1)

    // This would have been the unlocking tap had the window not lapsed; instead it starts over.
    act(() => result.current.tap())
    expect(onUnlock).not.toHaveBeenCalled()
    expect(result.current.remaining).toBe(SECRET_TAP_COUNT - 1)
  })

  it("keeps counting while taps stay inside the window", () => {
    const onUnlock = vi.fn()
    const { now, advance } = clock()
    const { result } = renderHook(() => useSecretTaps(onUnlock, now))

    for (let i = 0; i < SECRET_TAP_COUNT; i++) {
      act(() => result.current.tap())
      advance(SECRET_TAP_WINDOW_MS - 1)
    }
    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it("starts a fresh sequence after unlocking, so a second run re-fires", () => {
    const onUnlock = vi.fn()
    const { now } = clock()
    const { result } = renderHook(() => useSecretTaps(onUnlock, now))

    tapTimes(result, SECRET_TAP_COUNT * 2)
    expect(onUnlock).toHaveBeenCalledTimes(2)
  })
})
