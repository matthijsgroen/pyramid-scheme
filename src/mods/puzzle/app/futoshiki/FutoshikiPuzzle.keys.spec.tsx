// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { FutoshikiPuzzle as FutoshikiData } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"

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

// A 3×3 with three squares open: 1 < 2 across the top, 3 below the 2.
const puzzle: FutoshikiData = {
  size: 3,
  givens: [
    [undefined, undefined, 3],
    [2, undefined, 1],
    [3, 1, 2],
  ],
  constraints: [{ row: 0, col: 0, direction: "right", relation: "<" }],
  solution: [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
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
  const { container } = render(<FutoshikiPuzzle puzzle={puzzle} onSolved={onSolved} onCancel={() => {}} />)
  return { container, onSolved }
}

describe("FutoshikiPuzzle by keys", () => {
  it("writes, pencils and erases where the cursor is, as the pad does for a tapped square", () => {
    const keys = renderPuzzle()
    key("Digit2")
    key("ArrowRight")
    key("ShiftLeft")
    key("Digit1")
    key("Digit3")
    key("ShiftLeft")
    key("ArrowDown")
    key("Digit3")
    key("Delete")
    // Past the pad: nothing.
    key("Digit7")
    const keyed = drawn(keys.container)
    cleanup()

    const taps = renderPuzzle()
    const tap = (label: string) => act(() => padIn(taps.container, label).click())
    act(() => cellsIn(taps.container)[0].click())
    tap("2")
    act(() => cellsIn(taps.container)[1].click())
    tap("ui.notes")
    tap("1")
    tap("3")
    tap("ui.notes")
    act(() => cellsIn(taps.container)[4].click())
    tap("3")
    tap("ui.erase")
    expect(keyed).toEqual(drawn(taps.container))
  })

  it("solves on a game pad: the shoulder buttons pick a number and confirm places it", () => {
    vi.useFakeTimers()
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      const { container, onSolved } = renderPuzzle()
      key("PageDown")
      key("Enter")
      key("ArrowRight")
      key("PageDown")
      key("Enter")
      key("ArrowDown")
      key("PageDown")
      expect(padIn(container, "3").classList.contains("board-cursor")).toBe(true)
      key("Enter")
      act(() => vi.advanceTimersByTime(5000))
      key("Enter")
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
