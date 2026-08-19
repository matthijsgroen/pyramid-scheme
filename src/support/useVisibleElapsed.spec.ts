import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useVisibleElapsed } from "./useVisibleElapsed"

const setVisibility = (state: DocumentVisibilityState) => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state)
  act(() => document.dispatchEvent(new Event("visibilitychange")))
}

describe("useVisibleElapsed", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("counts the time the document is on screen", () => {
    const { result } = renderHook(() => useVisibleElapsed())
    vi.advanceTimersByTime(5000)
    expect(result.current()).toBe(5000)
  })

  // A puzzle left open in a background tab, or a phone put in a pocket, is not time spent on the board.
  it("stops while the document is hidden and picks up where it left off", () => {
    const { result } = renderHook(() => useVisibleElapsed())
    vi.advanceTimersByTime(3000)

    setVisibility("hidden")
    vi.advanceTimersByTime(60_000)
    expect(result.current()).toBe(3000)

    setVisibility("visible")
    vi.advanceTimersByTime(2000)
    expect(result.current()).toBe(5000)
  })
})
