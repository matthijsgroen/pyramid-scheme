// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import type { BalancePuzzle as BalancePuzzleData } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { BalancePuzzle } from "./BalancePuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => {
  controlsInARow()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const feather = { kind: "glyph", glyph: "🪶" } as const
const beetle = { kind: "glyph", glyph: "🪲" } as const
const weight = (value: number) => ({ kind: "weight", value }) as const

/** Two feathers weigh a beetle and 2; a beetle weighs a feather and 1. A feather is 3, a beetle 4. */
const puzzle: BalancePuzzleData = {
  glyphs: ["🪶", "🪲"],
  scales: [
    { left: [feather, feather], right: [beetle, weight(2)] },
    { left: [beetle], right: [feather, weight(1)] },
  ],
  maxValue: 5,
  cancelling: false,
  solution: { "🪶": 3, "🪲": 4 },
  techniqueCap: "swap",
}

const renderPuzzle = () => {
  const { container } = render(<BalancePuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const buttons = (marker: string) =>
    within(container)
      .getAllByRole("button")
      .filter(button => button.className.includes(marker))
  return {
    glyphs: () => buttons("min-w-16"),
    weights: () => buttons("size-11"),
    pieces: () => buttons("min-w-9"),
    rows: () =>
      [...container.querySelectorAll<HTMLElement>(".rounded-lg.border")].filter(row => row.querySelector("span")),
    notes: () => [...container.querySelectorAll(".border-dashed")].map(note => note.textContent),
    read: () => buttons("min-w-16").map(glyph => glyph.textContent),
  }
}

describe("BalancePuzzle by keys", () => {
  it("weighs the glyphs by keys as taps weigh them, a digit being the palette's key", () => {
    const keys = renderPuzzle()
    press("Digit3")
    for (let i = 0; i < 6; i++) press("ArrowRight")
    expect(document.activeElement).toBe(keys.glyphs()[1])
    press("Enter")
    for (let i = 0; i < 4; i++) press("ArrowRight")
    expect(document.activeElement).toBe(keys.weights()[3])
    press("Enter")
    const keyed = keys.read()
    cleanup()

    const taps = renderPuzzle()
    act(() => taps.weights()[2].click())
    act(() => taps.glyphs()[1].click())
    act(() => taps.weights()[3].click())
    expect(keyed).toEqual(taps.read())
    expect(keyed).toEqual(["🪶3", "🪲4"])
  })

  it("goes back up to the feather it came down from, where the beetle sits between two", () => {
    const keys = renderPuzzle()
    const [, second] = keys.pieces()
    const beetle = keys.pieces()[4]
    // The pans centre their pieces, so the beetle below stands between the two feathers above it.
    const at = new Map<Element, { left: number; top: number }>([
      [keys.pieces()[0], { left: 0, top: 0 }],
      [second, { left: 40, top: 0 }],
      [beetle, { left: 20, top: 40 }],
    ])
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
      const { left, top } = at.get(this) ?? { left: 0, top: -1000 }
      return { left, top, width: 10, height: 10 } as DOMRect
    })
    act(() => second.focus())
    press("ArrowDown")
    expect(document.activeElement).toBe(beetle)
    press("ArrowUp")
    expect(document.activeElement).toBe(second)
  })

  it("trades a glyph by keys as taps trade it: the piece, then the row that answers it", () => {
    const keys = renderPuzzle()
    expect(document.activeElement).toBe(keys.pieces()[0])
    press("ArrowRight")
    press("ArrowRight")
    press("Enter")
    expect(keys.rows()[1].getAttribute("role")).toBe("button")
    press("ArrowRight")
    expect(document.activeElement).toBe(keys.rows()[1])
    press("Enter")
    const keyed = keys.notes()
    cleanup()

    const taps = renderPuzzle()
    act(() => taps.pieces()[2].click())
    act(() => taps.rows()[1].click())
    expect(keyed).toEqual(taps.notes())
    expect(keyed).toHaveLength(1)
  })
})
