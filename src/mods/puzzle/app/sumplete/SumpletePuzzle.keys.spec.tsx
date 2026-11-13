// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Keep the diagonal, strike the rest.
const puzzle: SumpleteGrid = {
  grid: [
    [1, 2],
    [3, 4],
  ],
  rowTargets: [1, 4],
  colTargets: [1, 4],
  solution: [
    [true, false],
    [false, true],
  ],
  techniqueCap: "parity",
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

const marks = (root: HTMLElement) =>
  cellsIn(root).map(cell =>
    cell.className.includes("green") ? "keep" : cell.className.includes("bg-stone-900") ? "strike" : "unknown"
  )

const renderPuzzle = () => {
  const onSolved = vi.fn()
  const { container } = render(
    <SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={onSolved} onCancel={() => {}} />
  )
  return { container, onSolved }
}

describe("SumpletePuzzle by keys", () => {
  it("cycles the cell under the cursor the way a tap cycles it", () => {
    const keys = renderPuzzle()
    key("ArrowRight")
    key("Enter")
    key("ArrowDown")
    key("Enter")
    key("Enter")
    const keyed = marks(keys.container)
    cleanup()

    const taps = renderPuzzle()
    act(() => cellsIn(taps.container)[1].click())
    act(() => cellsIn(taps.container)[3].click())
    act(() => cellsIn(taps.container)[3].click())
    expect(keyed).toEqual(marks(taps.container))
    expect(keyed).toEqual(["unknown", "strike", "unknown", "keep"])
  })

  it("draws the cursor on one cell, where a tap put it", () => {
    const { container } = renderPuzzle()
    const cursorAt = () => cellsIn(container).findIndex(cell => cell.classList.contains("board-cursor"))
    expect(cursorAt()).toBe(0)
    key("ArrowDown")
    expect(cursorAt()).toBe(2)
    act(() => cellsIn(container)[1].click())
    expect(cursorAt()).toBe(1)
    expect(container.querySelectorAll(".board-cursor")).toHaveLength(1)
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
      key("ArrowRight")
      key("Enter")
      key("ArrowDown")
      key("ArrowLeft")
      key("Enter")
      act(() => vi.advanceTimersByTime(5000))
      key("Enter")
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
