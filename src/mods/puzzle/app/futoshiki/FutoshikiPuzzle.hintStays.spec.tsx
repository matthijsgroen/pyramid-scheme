// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { FutoshikiPuzzle as FutoshikiPuzzleData } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { buildFutoshikiHint, type FutoshikiHint } from "./futoshikiHint"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"

vi.mock("./futoshikiHint", () => ({ buildFutoshikiHint: vi.fn() }))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const _ = undefined
// A 5×5 board with two givens; the hint is scripted, so the signs only have to be the board's own.
const puzzle: FutoshikiPuzzleData = {
  size: 5,
  givens: [
    [_, _, _, _, _],
    [_, _, _, _, _],
    [_, _, _, _, 5],
    [_, _, _, _, _],
    [_, _, _, _, 1],
  ],
  constraints: [
    { row: 0, col: 2, direction: "right", relation: "<" },
    { row: 1, col: 0, direction: "right", relation: ">" },
    { row: 4, col: 1, direction: "right", relation: "<" },
  ],
  solution: [
    [1, 5, 3, 4, 2],
    [5, 4, 1, 2, 3],
    [4, 1, 2, 3, 5],
    [3, 2, 5, 1, 4],
    [2, 3, 4, 5, 1],
  ],
  techniqueCap: "signChain",
}
const empty = puzzle.givens.flatMap((row, r) => row.flatMap((value, c) => (value === undefined ? [{ r, c }] : [])))
const [A, B] = empty

const hintOf = (key: string): FutoshikiHint => ({
  key,
  params: {},
  cells: new Set([`${A.r},${A.c}`]),
  constraints: new Set(),
  focus: { row: A.r, col: A.c },
})

const setup = () => {
  const current = { hint: hintOf("first") }
  vi.mocked(buildFutoshikiHint).mockReset()
  vi.mocked(buildFutoshikiHint).mockImplementation(() => current.hint)
  const { container } = render(
    <FutoshikiPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
  )
  const cells = () =>
    within(container)
      .getAllByRole("button")
      .filter(button => button.className.includes("aspect-square"))
  const pad = (label: string) =>
    within(container)
      .getAllByRole<HTMLButtonElement>("button", { name: label })
      .filter(button => !button.className.includes("aspect-square"))[0]
  return {
    reveal: () => {
      act(() => within(container).getByRole("button", { name: /hint/i }).click())
      current.hint = hintOf("second")
    },
    select: (cell: { r: number; c: number }) => act(() => cells()[cell.r * puzzle.size + cell.c].click()),
    press: (label: string) => act(() => pad(label).click()),
    text: () => container.textContent ?? "",
  }
}

describe("FutoshikiPuzzle hint that stays", () => {
  it("keeps the hint when a square is selected, and its text as it was revealed", () => {
    const { reveal, select, text } = setup()
    reveal()
    select(B)
    expect(text()).toContain("hint.first")
    expect(text()).not.toContain("hint.second")
  })

  it("keeps the hint when the pencil is toggled", () => {
    const { reveal, press, text } = setup()
    reveal()
    press("ui.notes")
    expect(text()).toContain("hint.first")
  })

  it("keeps the hint when an empty square is erased, which changes nothing", () => {
    const { reveal, select, press, text } = setup()
    reveal()
    select(B)
    press("ui.erase")
    expect(text()).toContain("hint.first")
  })

  it("ends the hint when a number is entered", () => {
    const { reveal, press, text } = setup()
    reveal()
    press("1")
    expect(text()).not.toContain("hint.first")
  })
})
