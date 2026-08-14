import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useExpeditionFlow } from "./useExpeditionFlow"

type Props = {
  levelNr: number
  completionCount: number
  interiorLevelNr: number | null
  hasInterior: boolean
}

const setup = (over: Partial<Props> = {}) => {
  const setInteriorLevel = vi.fn()
  const onNextLevel = vi.fn()
  const onClose = vi.fn()
  const initialProps: Props = {
    levelNr: 1,
    completionCount: 0,
    interiorLevelNr: null,
    hasInterior: false,
    ...over,
  }
  const hook = renderHook(
    (props: Props) =>
      useExpeditionFlow({
        journeyId: "j1",
        ...props,
        setInteriorLevel,
        onNextLevel,
        onClose,
      }),
    { initialProps }
  )
  return { hook, setInteriorLevel, onNextLevel, onClose, initialProps }
}

// Both transition chains finish inside 2s.
const finishTransition = () => act(() => void vi.advanceTimersByTime(2500))

describe("useExpeditionFlow", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("opens straight into the interior the player backed out of, skipping the solved board", () => {
    const { hook } = setup({ hasInterior: true, interiorLevelNr: 1, levelNr: 1 })

    expect(hook.result.current.showingInterior).toBe(true)
  })

  it("celebrates a solved board once, and not again underneath an open interior", () => {
    const { hook } = setup({ hasInterior: true, interiorLevelNr: 1, levelNr: 1 })

    act(() => hook.result.current.completeLevel())

    expect(hook.result.current.levelCompleted).toBe(false)
  })

  it("drops into the interior after the celebration, and remembers it for re-entry", () => {
    const { hook, setInteriorLevel } = setup({ hasInterior: true, levelNr: 2 })
    act(() => hook.result.current.completeLevel())

    act(() => hook.result.current.completionFinished())

    expect(hook.result.current.showingInterior).toBe(true)
    expect(setInteriorLevel).toHaveBeenCalledWith("j1", 2)
    expect(hook.result.current.levelCompleted).toBe(false)
  })

  it("transitions to the next level after the celebration when the journey has no interior", () => {
    const { hook, onNextLevel } = setup({ hasInterior: false })
    act(() => hook.result.current.completeLevel())

    act(() => hook.result.current.completionFinished())
    expect(hook.result.current.startNextLevel).toBe(false)

    finishTransition()

    expect(hook.result.current.startNextLevel).toBe(true)
    expect(onNextLevel).toHaveBeenCalled()
  })

  it("advances the expedition once the interior is finished, closing it first", () => {
    const { hook, setInteriorLevel, onNextLevel } = setup({ hasInterior: true, interiorLevelNr: 1 })

    act(() => hook.result.current.interiorComplete())
    expect(hook.result.current.showingInterior).toBe(false)
    expect(setInteriorLevel).toHaveBeenCalledWith("j1", null)

    finishTransition()

    expect(onNextLevel).toHaveBeenCalled()
  })

  it("returns a revisited pyramid to the map instead of advancing the journey again", () => {
    const { hook, onClose, onNextLevel } = setup({ hasInterior: true, interiorLevelNr: 1, completionCount: 1 })

    act(() => hook.result.current.interiorComplete())
    finishTransition()

    expect(onClose).toHaveBeenCalled()
    expect(onNextLevel).not.toHaveBeenCalled()
  })

  it("keeps the interior openable when the player backs out, so re-entry lands inside", () => {
    const { hook, onClose, setInteriorLevel } = setup({ hasInterior: true, interiorLevelNr: 1 })

    act(() => hook.result.current.leaveInterior())

    expect(hook.result.current.showingInterior).toBe(false)
    expect(onClose).toHaveBeenCalled()
    expect(setInteriorLevel).not.toHaveBeenCalled()
  })

  it("clears a running transition when the level arrives, so the board isn't left flung off-screen", () => {
    const { hook, initialProps } = setup({ hasInterior: false })
    act(() => hook.result.current.completeLevel())
    act(() => hook.result.current.completionFinished())
    finishTransition()
    expect(hook.result.current.startNextLevel).toBe(true)

    hook.rerender({ ...initialProps, levelNr: 2 })

    expect(hook.result.current.startNextLevel).toBe(false)
  })

  it("re-seeds on a revisit that moves the level down, rather than transitioning forever", () => {
    const { hook, initialProps } = setup({ hasInterior: false, levelNr: 3 })
    act(() => hook.result.current.completeLevel())
    act(() => hook.result.current.completionFinished())
    finishTransition()

    hook.rerender({ ...initialProps, levelNr: 1 })

    expect(hook.result.current.startNextLevel).toBe(false)
    expect(hook.result.current.levelCompleted).toBe(false)
  })

  it("drops a queued transition step when the level moves under it", () => {
    const { hook, initialProps, onNextLevel } = setup({ hasInterior: false })
    act(() => hook.result.current.completeLevel())
    act(() => hook.result.current.completionFinished())

    // The level arrives (from elsewhere) before the queued steps fire.
    hook.rerender({ ...initialProps, levelNr: 2 })
    finishTransition()

    expect(onNextLevel).not.toHaveBeenCalled()
    expect(hook.result.current.startNextLevel).toBe(false)
  })
})
