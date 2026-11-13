// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

const starsAt = (size: number, cols: readonly number[]) =>
  Array.from({ length: size * size }, (_unused, cell) => cols[Math.floor(cell / size)] === cell % size)

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// One region per row; the stars stand at columns 1, 3, 0, 2.
const puzzle: StarBattlePuzzleWithAnswer = {
  size: 4,
  quota: 1,
  regions: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
  solution: starsAt(4, [1, 3, 0, 2]),
  techniqueCap: "touch",
}

// Rows and columns only, with stone in the top-left corner. Never solved here, so its answer is not one.
const walled: StarBattlePuzzleWithAnswer = {
  size: 3,
  quota: 1,
  walls: [true, false, false, false, false, false, false, false, false],
  solution: starsAt(3, [1, 2, 0]),
  techniqueCap: "touch",
}

const key = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })

// Stone and squares together, in reading order.
const squaresIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("button.aspect-square, [data-wall]")]

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

const drawn = (root: HTMLElement) => cellsIn(root).map(cell => cell.innerHTML)

const renderPuzzle = (board: StarBattlePuzzleWithAnswer = puzzle) => {
  const onSolved = vi.fn()
  const { container } = render(
    <StarBattlePuzzle puzzle={board} difficulty="starter" onSolved={onSolved} onCancel={() => {}} />
  )
  return { container, onSolved }
}

describe("StarBattlePuzzle by keys", () => {
  it("cycles the square under the cursor the way a tap cycles it", () => {
    const keys = renderPuzzle()
    key("ArrowRight")
    key("Enter")
    key("Enter")
    key("ArrowDown")
    key("ArrowRight")
    key("Enter")
    const keyed = drawn(keys.container)
    cleanup()

    const taps = renderPuzzle()
    act(() => cellsIn(taps.container)[1].click())
    act(() => cellsIn(taps.container)[1].click())
    act(() => cellsIn(taps.container)[6].click())
    expect(keyed).toEqual(drawn(taps.container))
  })

  it("starts past stone, and a confirm on stone does nothing, as a tap on it does", () => {
    const { container } = renderPuzzle(walled)
    const squares = squaresIn(container)
    expect(squares.findIndex(square => square.classList.contains("board-cursor"))).toBe(1)
    const before = drawn(container)
    key("ArrowLeft")
    expect(squares[0].classList.contains("board-cursor")).toBe(true)
    key("Enter")
    expect(drawn(container)).toEqual(before)
  })

  it("solves by keys alone, and Enter leaves the solved board", () => {
    vi.useFakeTimers()
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      const { onSolved } = renderPuzzle()
      // A star is the second press on a square: the first rules it out.
      const star = () => {
        key("Enter")
        key("Enter")
      }
      key("ArrowRight")
      star()
      key("ArrowDown")
      key("ArrowRight")
      key("ArrowRight")
      star()
      key("ArrowDown")
      for (let i = 0; i < 3; i++) key("ArrowLeft")
      star()
      key("ArrowDown")
      key("ArrowRight")
      key("ArrowRight")
      star()
      act(() => vi.advanceTimersByTime(5000))
      key("Enter")
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
