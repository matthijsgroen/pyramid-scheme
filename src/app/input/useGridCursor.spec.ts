// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Direction } from "@/game/siteTypes"
import type { InputAction, InputSignal } from "./actions"
import { useGridCursor } from "./useGridCursor"

const signal = (action: InputAction, extra: Partial<InputSignal> = {}): InputSignal => ({
  action,
  source: "keys",
  repeat: false,
  released: false,
  target: null,
  ...extra,
})
const move = (dir: Direction) => signal({ kind: "move", dir })

const cursorOn = (rows = 3, cols = 4) => {
  const onConfirm = vi.fn()
  const onAlt = vi.fn()
  const hook = renderHook(() => useGridCursor({ rows, cols, onConfirm, onAlt }))
  const send = (s: InputSignal) => {
    let used = false
    act(() => {
      used = hook.result.current.handle(s)
    })
    return used
  }
  return { hook, send, onConfirm, onAlt }
}

describe(useGridCursor, () => {
  it("starts top-left, or where the board says its first open cell is", () => {
    expect(cursorOn().hook.result.current).toMatchObject({ row: 0, col: 0 })
    const started = renderHook(() =>
      useGridCursor({ rows: 3, cols: 3, start: () => ({ row: 1, col: 2 }), onConfirm: () => {} })
    )
    expect(started.result.current).toMatchObject({ row: 1, col: 2 })
  })

  it("moves one cell per direction and stops at the edge rather than wrapping", () => {
    const { hook, send } = cursorOn(3, 4)
    send(move("e"))
    send(move("s"))
    expect(hook.result.current).toMatchObject({ row: 1, col: 1 })
    for (let i = 0; i < 6; i++) send(move("e"))
    for (let i = 0; i < 6; i++) send(move("s"))
    expect(hook.result.current).toMatchObject({ row: 2, col: 3 })
    for (let i = 0; i < 6; i++) send(move("n"))
    for (let i = 0; i < 6; i++) send(move("w"))
    expect(hook.result.current).toMatchObject({ row: 0, col: 0 })
  })

  it("uses a direction even against the edge, so the page does not scroll", () => {
    expect(cursorOn().send(move("n"))).toBe(true)
  })

  it("keeps moving while a direction is held", () => {
    const { hook, send } = cursorOn()
    send(signal({ kind: "move", dir: "e" }, { repeat: true }))
    send(signal({ kind: "move", dir: "e" }, { repeat: true }))
    expect(hook.result.current.col).toBe(2)
  })

  it("confirms the cell under the cursor, once for a held key", () => {
    const { send, onConfirm } = cursorOn()
    send(move("s"))
    send(move("e"))
    send(signal({ kind: "confirm" }))
    send(signal({ kind: "confirm" }, { repeat: true }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(1, 1)
  })

  it("gives alt to the board's second action, and leaves it alone when there is none", () => {
    const { send, onAlt } = cursorOn()
    send(signal({ kind: "alt" }))
    expect(onAlt).toHaveBeenCalledWith(0, 0)
    const bare = renderHook(() => useGridCursor({ rows: 2, cols: 2, onConfirm: () => {} }))
    expect(bare.result.current.handle(signal({ kind: "alt" }))).toBe(false)
  })

  it("leaves every other action to the layer around it", () => {
    const { send, onConfirm } = cursorOn()
    for (const kind of ["back", "undo", "hint", "menu", "prev", "next"] as const) {
      expect(send(signal({ kind }))).toBe(false)
    }
    expect(send(signal({ kind: "confirm" }, { released: true }))).toBe(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("a tap moves the cursor there and makes the same call a confirm makes", () => {
    const { hook, send, onConfirm } = cursorOn()
    act(() => hook.result.current.tap(2, 3))
    expect(onConfirm).toHaveBeenLastCalledWith(2, 3)
    send(signal({ kind: "confirm" }))
    expect(onConfirm).toHaveBeenLastCalledWith(2, 3)
  })

  it("takes over from a focused button, so Enter presses the cell and not that button", () => {
    const button = document.body.appendChild(document.createElement("button"))
    button.focus()
    cursorOn().send(signal({ kind: "move", dir: "e" }, { target: button }))
    expect(document.activeElement).toBe(document.body)
    button.remove()
  })

  it("lands only on the stops it is given, the nearest one each way, even off the line", () => {
    const stops = [
      { row: 0, col: 0 },
      { row: 1, col: 3 },
      { row: 3, col: 1 },
    ]
    const hook = renderHook(() => useGridCursor({ rows: 4, cols: 4, stops, onConfirm: () => {} }))
    const send = (dir: Direction) => act(() => void hook.result.current.handle(move(dir)))
    send("e")
    expect(hook.result.current).toMatchObject({ row: 1, col: 3 })
    send("e")
    expect(hook.result.current).toMatchObject({ row: 1, col: 3 })
    send("s")
    expect(hook.result.current).toMatchObject({ row: 3, col: 1 })
    send("n")
    expect(hook.result.current).toMatchObject({ row: 0, col: 0 })
  })

  it("tells the board where each direction took it", () => {
    const onMove = vi.fn()
    const hook = renderHook(() => useGridCursor({ rows: 3, cols: 3, onConfirm: () => {}, onMove }))
    act(() => void hook.result.current.handle(move("s")))
    act(() => void hook.result.current.handle(move("e")))
    expect(onMove.mock.calls).toEqual([
      [1, 0],
      [1, 1],
    ])
  })

  it("stays on the board when the board shrinks", () => {
    const onConfirm = vi.fn()
    const hook = renderHook(({ size }) => useGridCursor({ rows: size, cols: size, onConfirm }), {
      initialProps: { size: 5 },
    })
    act(() => hook.result.current.tap(4, 4))
    hook.rerender({ size: 3 })
    expect(hook.result.current).toMatchObject({ row: 2, col: 2 })
  })
})
