// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { EclipsePuzzleWithAnswer } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { EclipsePuzzle } from "./EclipsePuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// The top-left sun is given; the rest is a checkerboard.
const puzzle: EclipsePuzzleWithAnswer = {
  size: 2,
  given: ["sun", undefined, undefined, undefined],
  links: [],
  solution: ["sun", "moon", "moon", "sun"],
  techniqueCap: "noTriple",
  variant: "mixed",
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

// What each square shows: its glyph's markup, which differs per mark.
const drawn = (root: HTMLElement) => cellsIn(root).map(cell => cell.innerHTML)

const renderPuzzle = () => {
  const onSolved = vi.fn()
  const { container } = render(<EclipsePuzzle puzzle={puzzle} onSolved={onSolved} onCancel={() => {}} />)
  return { container, onSolved }
}

describe("EclipsePuzzle by keys", () => {
  it("starts the cursor on the first square a player can change", () => {
    const { container } = renderPuzzle()
    expect(cellsIn(container).findIndex(cell => cell.classList.contains("board-cursor"))).toBe(1)
  })

  it("cycles the square under the cursor the way a tap cycles it, and leaves a given alone", () => {
    const keys = renderPuzzle()
    key("Enter")
    key("ArrowDown")
    key("Enter")
    key("Enter")
    key("ArrowLeft")
    key("ArrowUp")
    key("Enter")
    const keyed = drawn(keys.container)
    cleanup()

    const taps = renderPuzzle()
    act(() => cellsIn(taps.container)[1].click())
    act(() => cellsIn(taps.container)[3].click())
    act(() => cellsIn(taps.container)[3].click())
    act(() => cellsIn(taps.container)[0].click())
    expect(keyed).toEqual(drawn(taps.container))
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
      // sun → moon on the right, moon below-left, sun below-right.
      key("Enter")
      key("Enter")
      key("ArrowDown")
      key("Enter")
      key("ArrowLeft")
      key("Enter")
      key("Enter")
      act(() => vi.advanceTimersByTime(5000))
      key("Enter")
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it("steps back with Z through the shell's undo", () => {
    const { container } = renderPuzzle()
    const before = drawn(container)
    key("Enter")
    expect(drawn(container)).not.toEqual(before)
    key("KeyZ")
    expect(drawn(container)).toEqual(before)
  })
})
