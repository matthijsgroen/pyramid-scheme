// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { usePyramidNavigation } from "@/app/PyramidLevel/usePyramidNavigation"
import { describe, expect, it, vi } from "vitest"
import type { InputAction, InputSignal } from "@/app/input/actions"
import type { PyramidBlock } from "@/game/types"

const signal = (action: InputAction, extra: Partial<InputSignal> = {}): InputSignal => ({
  action,
  source: "keys",
  repeat: false,
  released: false,
  target: null,
  ...extra,
})

describe(usePyramidNavigation, () => {
  const floorStartIndices = [0, 1, 3] // Example for 3 floors
  const floorCount = 3
  const blocks: PyramidBlock[] = [
    { id: "A", value: 1, isOpen: true }, // 0
    { id: "B", value: 2, isOpen: true }, // 1
    { id: "C", value: 3, isOpen: true }, // 2
    { id: "D", value: 4, isOpen: true }, // 3
    { id: "E", value: 5, isOpen: true }, // 4
    { id: "F", value: 6, isOpen: false }, // 5
  ]

  const navigate = (values: Record<string, number | undefined> = {}) => {
    const onAnswer = vi.fn()
    const hook = renderHook(() => usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer, values))
    const send = (action: InputAction, extra?: Partial<InputSignal>) => {
      let used = false
      act(() => {
        used = hook.result.current.handle(signal(action, extra))
      })
      return used
    }
    return { result: hook.result, send, onAnswer }
  }

  it("initializes with selectedBlockIndex 0 and focusInput false", () => {
    const { result } = navigate()
    expect(result.current.selectedBlockIndex).toBe(0)
    expect(result.current.focusInput).toBe(false)
  })

  it("moves selection along a floor and down onto the longer one", () => {
    const { result, send } = navigate()
    send({ kind: "move", dir: "s" })
    expect(result.current.selectedBlockIndex).toBe(1)
    send({ kind: "move", dir: "e" })
    expect(result.current.selectedBlockIndex).toBe(2)
  })

  it("stops at a floor's ends and the pyramid's top and bottom, still using the direction", () => {
    const { result, send } = navigate()
    expect(send({ kind: "move", dir: "n" })).toBe(true)
    expect(send({ kind: "move", dir: "w" })).toBe(true)
    expect(result.current.selectedBlockIndex).toBe(0)
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "s" })
    expect(result.current.selectedBlockIndex).toBe(3)
  })

  it("sets focusInput true on confirm", () => {
    const { result, send } = navigate()
    send({ kind: "confirm" })
    expect(result.current.focusInput).toBe(true)
  })

  it("calls onAnswer and sets focusInput true on a digit, and leaves the next digit to the open field", () => {
    const { result, send, onAnswer } = navigate()
    send({ kind: "value", value: 5 })
    expect(onAnswer).toHaveBeenCalledWith("A", 5)
    expect(result.current.focusInput).toBe(true)
    expect(send({ kind: "value", value: 6 })).toBe(false)
  })

  it("moves selection up and down floors", () => {
    const { result, send } = navigate()
    act(() => {
      result.current.setSelectedBlockIndex(1) // Select block on floor 1
    })
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "s" })
    // Floor 2, index 1
    expect(result.current.selectedBlockIndex).toBe(4)
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "n" })
    // From the end of floor 2 up to the end of floor 1
    expect(result.current.selectedBlockIndex).toBe(2)
  })

  it("counts an open block's value up and down with next and prev, down to empty", () => {
    const counted = navigate({ A: 3 })
    counted.send({ kind: "next" })
    expect(counted.onAnswer).toHaveBeenLastCalledWith("A", 4)
    counted.send({ kind: "prev" })
    expect(counted.onAnswer).toHaveBeenLastCalledWith("A", 2)

    const empty = navigate({ A: 1 })
    empty.send({ kind: "prev" })
    expect(empty.onAnswer).toHaveBeenLastCalledWith("A", undefined)
    const fresh = navigate()
    fresh.send({ kind: "next" })
    expect(fresh.onAnswer).toHaveBeenLastCalledWith("A", 1)
  })

  it("empties an open block on erase", () => {
    const { send, onAnswer } = navigate({ A: 3 })
    expect(send({ kind: "erase" })).toBe(true)
    expect(onAnswer).toHaveBeenLastCalledWith("A", undefined)
  })

  it("leaves a closed block's value alone", () => {
    const { result, send, onAnswer } = navigate()
    act(() => result.current.setSelectedBlockIndex(5))
    expect(send({ kind: "next" })).toBe(false)
    expect(send({ kind: "erase" })).toBe(false)
    expect(onAnswer).not.toHaveBeenCalled()
  })
})
