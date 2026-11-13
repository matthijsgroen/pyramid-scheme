// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
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

const down = (code: string) =>
  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true })))
const up = (code: string) => act(() => void window.dispatchEvent(new KeyboardEvent("keyup", { code })))
const key = (code: string) => {
  down(code)
  up(code)
}

// A finger down on the first square, dragged across each next one, and lifted, on a grid stubbed to a known
// size since jsdom lays nothing out.
const drag = (root: HTMLElement, size: number, path: number[]) => {
  const cells = cellsIn(root)
  const side = size * 100
  cells[0].parentElement!.getBoundingClientRect = () => ({ left: 0, top: 0, width: side, height: side }) as DOMRect
  const at = (cell: number) => ({ clientX: (cell % size) * 100 + 50, clientY: Math.floor(cell / size) * 100 + 50 })
  const start = squaresIn(root)[path[0]]
  act(() => fireEvent.pointerDown(start, { ...at(path[0]), pointerId: 1 }))
  for (const cell of path.slice(1)) act(() => fireEvent.pointerMove(start, { ...at(cell), pointerId: 1 }))
  act(() => fireEvent.pointerUp(start, { pointerId: 1 }))
  act(() => start.click())
}

const marks = (root: HTMLElement) => root.querySelectorAll("circle").length

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

  it("sweeps a run with Shift held, as a drag across the same squares does, and one undo takes it back", () => {
    const keys = renderPuzzle()
    down("ShiftLeft")
    key("ArrowRight")
    key("ArrowRight")
    key("ArrowDown")
    // Drawn while held, before anything lands.
    expect(marks(keys.container)).toBe(4)
    up("ShiftLeft")
    const keyed = drawn(keys.container)
    key("KeyZ")
    expect(marks(keys.container)).toBe(0)
    cleanup()

    const pointer = renderPuzzle()
    drag(pointer.container, 4, [0, 1, 2, 6])
    expect(keyed).toEqual(drawn(pointer.container))
  })

  it("passes stone over in a sweep, as a drag does", () => {
    const keys = renderPuzzle(walled)
    // The cursor starts past the stone, on the second square.
    key("ArrowLeft")
    key("ArrowDown")
    down("KeyN")
    key("ArrowUp")
    key("ArrowRight")
    key("ArrowRight")
    up("KeyN")
    const keyed = drawn(keys.container)
    cleanup()

    const pointer = renderPuzzle(walled)
    drag(pointer.container, 3, [3, 0, 1, 2])
    expect(keyed).toEqual(drawn(pointer.container))
    expect(marks(pointer.container)).toBe(3)
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
