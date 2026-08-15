import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { HINT_COOLDOWN_MS, HINT_IDLE_MS, hintIdleDelay, useHintAvailability } from "./useHintAvailability"

describe("useHintAvailability", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("hides the hint until it is asked for", () => {
    const { result } = renderHook(() => useHintAvailability())
    expect(result.current.revealed).toBe(false)
    act(() => result.current.reveal())
    expect(result.current.revealed).toBe(true)
  })

  it("makes a revealed hint cost a wait before the next one", () => {
    const { result } = renderHook(() => useHintAvailability())
    act(() => result.current.reveal())
    expect(result.current.cooling).toBe(true)
    act(() => vi.advanceTimersByTime(HINT_COOLDOWN_MS - 1))
    expect(result.current.cooling).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.cooling).toBe(false)
  })

  it("nudges a player who has stopped moving", () => {
    const { result } = renderHook(() => useHintAvailability())
    act(() => vi.advanceTimersByTime(HINT_IDLE_MS))
    expect(result.current.nudging).toBe(true)
  })

  it("restarts the idle wait on every move", () => {
    const { result } = renderHook(() => useHintAvailability())
    act(() => vi.advanceTimersByTime(HINT_IDLE_MS - 1000))
    act(() => result.current.reportInput())
    act(() => vi.advanceTimersByTime(HINT_IDLE_MS - 1))
    expect(result.current.nudging).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.nudging).toBe(true)
  })

  it("waits the caller's own idle time before nudging", () => {
    const { result } = renderHook(() => useHintAvailability(hintIdleDelay("wizard")))
    act(() => vi.advanceTimersByTime(HINT_IDLE_MS))
    expect(result.current.nudging).toBe(false)
    act(() => vi.advanceTimersByTime(hintIdleDelay("wizard") - HINT_IDLE_MS))
    expect(result.current.nudging).toBe(true)
  })

  it("backs the nudge off as the tier climbs — a quiet wizard board is someone thinking", () => {
    expect(hintIdleDelay("starter")).toBe(30000)
    expect(hintIdleDelay("wizard")).toBe(90000)
    expect(hintIdleDelay(undefined)).toBe(hintIdleDelay("starter"))
    expect(difficulties.map(hintIdleDelay)).toEqual([...difficulties.map(hintIdleDelay)].sort((a, b) => a - b))
  })

  it("counts the hints taken, so a solve can say whether it was unaided", () => {
    const { result } = renderHook(() => useHintAvailability())
    expect(result.current.hintsUsed).toBe(0)
    act(() => result.current.reveal())
    act(() => vi.advanceTimersByTime(HINT_COOLDOWN_MS))
    act(() => result.current.reveal())
    expect(result.current.hintsUsed).toBe(2)
  })

  it("drops a revealed hint once the player moves, since the board it described has changed", () => {
    const { result } = renderHook(() => useHintAvailability())
    act(() => result.current.reveal())
    act(() => result.current.reportInput())
    expect(result.current.revealed).toBe(false)
  })
})
