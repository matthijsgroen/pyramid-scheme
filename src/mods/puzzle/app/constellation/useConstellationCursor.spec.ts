// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { InputAction } from "@/app/input/actions"
import { pairsOf, type Star } from "@/mods/puzzle/game/constellation/constellation"
import { useConstellationCursor } from "./useConstellationCursor"

//  1 . 1 . .   three stars: two on the top row, one far below the first.
//  . . . . .
//  . . . . .
//  . . . . .
//  1 . . . .
const stars: Star[] = [
  { cell: 0, count: 1 },
  { cell: 2, count: 1 },
  { cell: 20, count: 1 },
]
const puzzle = { size: 5, stars, pairs: pairsOf(5, stars) }
const pairBetween = (a: number, b: number) =>
  puzzle.pairs.findIndex(pair => (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a))

const setup = () => {
  const onDrawLine = vi.fn()
  const { result, rerender } = renderHook(({ done }) => useConstellationCursor({ puzzle, onDrawLine, done }), {
    initialProps: { done: false },
  })
  const send = (action: InputAction, { released = false, repeat = false } = {}) =>
    act(() => {
      result.current.handle({ action, source: "pad", repeat, released, target: null })
    })
  return { result, send, onDrawLine, solve: () => rerender({ done: true }) }
}

describe("useConstellationCursor", () => {
  it("jumps to the nearest star a direction points at, over empty sky, and stays where none lies", () => {
    const { result, send } = setup()
    send({ kind: "move", dir: "s" })
    expect(result.current.cursor).toBe(2)
    send({ kind: "move", dir: "w" })
    expect(result.current.cursor).toBe(2)
  })

  it("cycles the pair a direction points at only while alt is held", () => {
    const { result, send, onDrawLine } = setup()
    send({ kind: "alt" })
    expect(result.current.alt).toBe(true)
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "s" })
    send({ kind: "move", dir: "n" })
    send({ kind: "alt" }, { released: true })
    send({ kind: "move", dir: "e" })
    expect(onDrawLine.mock.calls).toEqual([[pairBetween(0, 1)], [pairBetween(0, 2)]])
    expect(result.current.cursor).toBe(1)
  })

  it("does not cycle again on a held direction's repeat", () => {
    const { send, onDrawLine } = setup()
    send({ kind: "alt" })
    send({ kind: "move", dir: "e" })
    send({ kind: "move", dir: "e" }, { repeat: true })
    expect(onDrawLine).toHaveBeenCalledTimes(1)
  })

  it("lets a held star go once the board is solved, and picks none up after", () => {
    const { result, send, solve } = setup()
    send({ kind: "confirm" })
    expect(result.current.held).toBe(true)
    solve()
    expect(result.current.held).toBe(false)
    send({ kind: "confirm" })
    expect(result.current.held).toBe(false)
  })
})
