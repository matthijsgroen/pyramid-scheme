// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { InputAction } from "@/app/input/actions"
import { useProcessionCursor } from "./useProcessionCursor"

const setup = (locked?: boolean[], focus?: number) => {
  const calls = { onFocus: vi.fn(), onSlide: vi.fn() }
  const { result } = renderHook(() => useProcessionCursor({ starts: [0, 2, 4], locked, marks: 2, focus, ...calls }))
  const send = (action: InputAction) =>
    act(() => {
      result.current.handle({ action, source: "keys", repeat: false, released: false, target: null })
    })
  return { result, send, ...calls }
}

describe("useProcessionCursor", () => {
  it("walks the rows up and down and stops at the last", () => {
    const { result, send } = setup()
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "s" })
    expect(result.current.cursor).toBe(2)
    send({ kind: "move", dir: "n" })
    expect(result.current.cursor).toBe(1)
  })

  it("starts on the first free row and passes locked rows by", () => {
    const { result, send } = setup([true, true, false])
    expect(result.current.cursor).toBe(2)
    send({ kind: "move", dir: "n" })
    expect(result.current.cursor).toBe(2)
  })

  it("slides the cursor row's bar one tick per left or right", () => {
    const { send, onSlide } = setup()
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "w" })
    expect(onSlide.mock.calls).toEqual([
      [1, 3],
      [1, 1],
    ])
  })

  it("never slides a locked row", () => {
    const { result, send, onSlide } = setup([false, true, false])
    act(() => result.current.point(1))
    send({ kind: "move", dir: "e" })
    expect(onSlide).not.toHaveBeenCalled()
  })

  it("walks the marks in a ring that holds nothing picked between the last and the first", () => {
    // Nothing picked: next is the first mark, prev the last.
    const fromNone = setup()
    fromNone.send({ kind: "next" })
    fromNone.send({ kind: "prev" })
    expect(fromNone.onFocus.mock.calls).toEqual([[0], [1]])
    const fromLast = setup(undefined, 1)
    fromLast.send({ kind: "next" })
    expect(fromLast.onFocus).toHaveBeenCalledWith(undefined)
  })
})
