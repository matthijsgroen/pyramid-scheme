// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { SudokuPuzzle as SudokuData } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SudokuPuzzle } from "./SudokuPuzzle"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// A 4×4 of 2×2 chambers with three squares open: 1 and 2 across the top, 4 below the 2.
const puzzle: SudokuData = {
  size: 4,
  boxWidth: 2,
  boxHeight: 2,
  givens: [
    [undefined, undefined, 3, 4],
    [3, undefined, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ],
  solution: [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ],
  techniqueCap: "nakedSingle",
}

const key = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

const padIn = (root: HTMLElement, label: string) =>
  within(root)
    .getAllByRole<HTMLButtonElement>("button", { name: label })
    .find(button => !button.className.includes("aspect-square"))!

const drawn = (root: HTMLElement) => cellsIn(root).map(cell => cell.innerHTML)

const renderPuzzle = () => {
  const onSolved = vi.fn()
  const { container } = render(<SudokuPuzzle puzzle={puzzle} onSolved={onSolved} onCancel={() => {}} />)
  return { container, onSolved }
}

describe("SudokuPuzzle by keys", () => {
  it("writes, pencils and erases where the cursor is, as the pad does for a tapped square", () => {
    const keys = renderPuzzle()
    key("Digit3")
    key("ArrowRight")
    key("KeyN")
    key("Digit1")
    key("Digit2")
    key("KeyN")
    key("ArrowDown")
    key("Digit4")
    key("Delete")
    const keyed = drawn(keys.container)
    cleanup()

    const taps = renderPuzzle()
    const tap = (label: string) => act(() => padIn(taps.container, label).click())
    act(() => cellsIn(taps.container)[0].click())
    tap("3")
    act(() => cellsIn(taps.container)[1].click())
    tap("ui.notes")
    tap("1")
    tap("2")
    tap("ui.notes")
    act(() => cellsIn(taps.container)[5].click())
    tap("4")
    tap("ui.erase")
    expect(keyed).toEqual(drawn(taps.container))
  })

  it("picks the square the cursor moves onto, and Enter lets go of it as a second tap does", () => {
    const { container } = renderPuzzle()
    expect(padIn(container, "1").disabled).toBe(true)
    key("ArrowRight")
    expect(padIn(container, "1").disabled).toBe(false)
    expect(cellsIn(container)[1].classList.contains("board-cursor")).toBe(true)
    key("Enter")
    expect(padIn(container, "1").disabled).toBe(true)
  })

  it("solves on a game pad: the shoulder buttons pick a value and confirm places it", () => {
    vi.useFakeTimers()
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      const { container, onSolved } = renderPuzzle()
      key("BracketRight")
      expect(padIn(container, "1").classList.contains("board-cursor")).toBe(true)
      key("Enter")
      key("ArrowRight")
      key("BracketRight")
      key("Enter")
      key("ArrowDown")
      key("BracketLeft")
      key("BracketLeft")
      key("BracketLeft")
      // 2 → 1 → the eraser → 4, round the end of the pad.
      expect(padIn(container, "4").classList.contains("board-cursor")).toBe(true)
      key("Enter")
      act(() => vi.advanceTimersByTime(5000))
      key("Enter")
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
