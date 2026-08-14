import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEntranceAnimation } from "./useEntranceAnimation"

describe("useEntranceAnimation", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("holds the board untouchable while the entrance opens, then releases it", () => {
    const { result } = renderHook(() => useEntranceAnimation(true))
    expect(result.current.entering).toBe(true)

    act(() => void vi.advanceTimersByTime(900))

    expect(result.current.entering).toBe(false)
  })

  it("skips the animation entirely when the board isn't the thing being shown", () => {
    const { result } = renderHook(() => useEntranceAnimation(false))

    expect(result.current.entering).toBe(false)
  })

  it("stays in the entrance until its full duration has passed", () => {
    const { result } = renderHook(() => useEntranceAnimation(true))

    act(() => void vi.advanceTimersByTime(800))

    expect(result.current.entering).toBe(true)
  })
})
