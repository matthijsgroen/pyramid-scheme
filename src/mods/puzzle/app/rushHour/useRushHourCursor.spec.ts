// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { InputAction } from "@/app/input/actions"
import type { RushHourPuzzle } from "@/mods/puzzle/game/rushHour/rushHour"
import { useRushHourCursor } from "./useRushHourCursor"

//  P P . A . .
//  . . . A . .
//  . B B B . .
const puzzle: RushHourPuzzle = {
  size: 6,
  pieces: [
    { lane: 0, offset: 0, len: 2, horizontal: true },
    { lane: 3, offset: 0, len: 2, horizontal: false },
    { lane: 2, offset: 1, len: 3, horizontal: true },
  ],
}
const state = { offsets: [0, 0, 1] }

const setup = () => {
  const calls = { onGrab: vi.fn(), onSlide: vi.fn(), onRelease: vi.fn() }
  const { result } = renderHook(() => useRushHourCursor({ puzzle, state, ...calls }))
  const send = (action: InputAction) => {
    let used = false
    act(() => {
      used = result.current.handle({ action, source: "keys", repeat: false, released: false, target: null })
    })
    return used
  }
  return { result, send, ...calls }
}

describe("useRushHourCursor", () => {
  it("starts on the player's piece and jumps to the nearest piece in a direction", () => {
    const { result, send } = setup()
    expect(result.current.cursor).toBe(0)
    send({ kind: "move", dir: "e" })
    expect(result.current.cursor).toBe(1)
    send({ kind: "move", dir: "s" })
    expect(result.current.cursor).toBe(2)
  })

  it("stays put where no piece lies that way", () => {
    const { result, send } = setup()
    send({ kind: "move", dir: "n" })
    expect(result.current.cursor).toBe(0)
  })

  it("takes the piece on confirm and shoves it one cell along its lane per direction", () => {
    const { result, send, onGrab, onSlide } = setup()
    send({ kind: "move", dir: "e" })
    send({ kind: "confirm" })
    expect(result.current.held).toBe(true)
    expect(onGrab).toHaveBeenCalledWith(1)
    send({ kind: "move", dir: "s" })
    expect(onSlide).toHaveBeenCalledWith(1, 1)
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "w" })
    expect(onSlide).toHaveBeenCalledTimes(1)
  })

  it("lets go on confirm or back, and keeps the shell's undo once it has let go", () => {
    const { result, send, onRelease } = setup()
    send({ kind: "confirm" })
    send({ kind: "confirm" })
    expect(result.current.held).toBe(false)
    send({ kind: "confirm" })
    expect(send({ kind: "back" })).toBe(true)
    expect(result.current.held).toBe(false)
    send({ kind: "confirm" })
    expect(send({ kind: "undo" })).toBe(false)
    expect(result.current.held).toBe(false)
    expect(onRelease).toHaveBeenCalledTimes(3)
  })

  it("lets a held piece go when a pointer takes a piece", () => {
    const { result, send, onRelease } = setup()
    send({ kind: "confirm" })
    act(() => result.current.point(2))
    expect(result.current.held).toBe(false)
    expect(result.current.cursor).toBe(2)
    expect(onRelease).toHaveBeenCalledTimes(1)
  })
})
