// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { act } from "react"
import type { PairPuzzleWithAnswer } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { PairPuzzle } from "./PairPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

// A 3×3 board with an anchor in the top-left corner and its piece beside it.
const puzzle: PairPuzzleWithAnswer = {
  size: 3,
  anchors: [true, false, false, false, false, false, false, false, false],
  rowCounts: [1, 0, 0],
  colCounts: [0, 1, 0],
  solution: [false, true, false, false, false, false, false, false, false],
  techniqueCap: "touch",
}

const down = (code: string) =>
  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true })))
const up = (code: string) => act(() => void window.dispatchEvent(new KeyboardEvent("keyup", { code })))
const key = (code: string) => {
  down(code)
  up(code)
}

// Anchors and squares together, in reading order.
const squaresIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("button.aspect-square, [data-anchor]")]
const cellsIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("button.aspect-square")]
// A piece's drawing masks itself with a React id, which differs between two renders.
const drawn = (root: HTMLElement) => cellsIn(root).map(cell => cell.innerHTML.replace(/_r_\w+?_/g, "id"))
const marks = (root: HTMLElement) => root.querySelectorAll("button.aspect-square circle").length

// A finger down on the first square, dragged across each next one, and lifted, on a grid stubbed to a known
// size since jsdom lays nothing out.
const drag = (root: HTMLElement, path: number[]) => {
  const side = puzzle.size * 100
  cellsIn(root)[0].parentElement!.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: side, height: side }) as DOMRect
  const at = (cell: number) => ({
    clientX: (cell % puzzle.size) * 100 + 50,
    clientY: Math.floor(cell / puzzle.size) * 100 + 50,
  })
  const start = squaresIn(root)[path[0]]
  act(() => fireEvent.pointerDown(start, { ...at(path[0]), pointerId: 1 }))
  for (const cell of path.slice(1)) act(() => fireEvent.pointerMove(start, { ...at(cell), pointerId: 1 }))
  act(() => fireEvent.pointerUp(start, { pointerId: 1 }))
  act(() => start.click())
}

const renderPuzzle = () => render(<PairPuzzle puzzle={puzzle} onSolved={vi.fn()} onCancel={() => {}} />)

describe("PairPuzzle by keys", () => {
  it("starts past the anchor and cycles the square under the cursor the way a tap cycles it", () => {
    const keys = renderPuzzle()
    expect(squaresIn(keys.container).findIndex(square => square.classList.contains("board-cursor"))).toBe(1)
    key("Enter")
    key("Enter")
    key("ArrowDown")
    key("Enter")
    const keyed = drawn(keys.container)
    cleanup()

    const taps = renderPuzzle()
    act(() => squaresIn(taps.container)[1].click())
    act(() => squaresIn(taps.container)[1].click())
    act(() => squaresIn(taps.container)[4].click())
    expect(keyed).toEqual(drawn(taps.container))
  })

  it("does nothing on a confirm on the anchor, as a tap on it does", () => {
    const { container } = renderPuzzle()
    key("ArrowLeft")
    const before = drawn(container)
    key("Enter")
    expect(drawn(container)).toEqual(before)
  })

  it("sweeps a run with alt held, as a drag across the same squares does, and one undo takes it back", () => {
    const keys = renderPuzzle()
    key("ArrowDown")
    down("ShiftLeft")
    key("ArrowLeft")
    key("ArrowUp")
    key("ArrowRight")
    key("ArrowRight")
    // Drawn while held, before anything lands; the anchor the run crossed is not among them.
    expect(marks(keys.container)).toBe(4)
    up("ShiftLeft")
    const keyed = drawn(keys.container)
    expect(marks(keys.container)).toBe(4)
    key("KeyZ")
    expect(marks(keys.container)).toBe(0)
    cleanup()

    const pointer = renderPuzzle()
    drag(pointer.container, [4, 3, 0, 1, 2])
    expect(keyed).toEqual(drawn(pointer.container))
  })
})
