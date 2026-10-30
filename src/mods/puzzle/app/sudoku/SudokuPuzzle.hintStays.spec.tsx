// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { FIXTURE } from "@/mods/puzzle/game/sudoku/boards.fixture"
import { buildSudokuHint, type SudokuHint } from "./sudokuHint"
import { SudokuPuzzle } from "./SudokuPuzzle"

// The builder says what the test scripts; the board and the pad are the real ones.
vi.mock("./sudokuHint", () => ({ buildSudokuHint: vi.fn() }))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle = FIXTURE.expert[0]
const empties = puzzle.givens.flatMap((row, r) => row.flatMap((value, c) => (value === undefined ? [{ r, c }] : [])))
const [A, B, C] = empties
const at = (cell: { r: number; c: number }) => cell.r * 6 + cell.c
const keyOf = (cell: { r: number; c: number }) => `${cell.r},${cell.c}`

const hintOf = (
  kind: "place" | "ruleOut",
  targets: [{ r: number; c: number }, number[]][],
  key = "first"
): SudokuHint => ({
  key,
  params: {},
  cells: new Set(targets.map(([cell]) => keyOf(cell))),
  evidence: new Set(),
  focus: { row: targets[0][0].r, col: targets[0][0].c },
  move: { kind, value: targets[0][1][0], count: targets.length },
  targets: new Map(targets.map(([cell, values]) => [keyOf(cell), values])),
})

const setup = (hint: SudokuHint) => {
  const current = { hint }
  vi.mocked(buildSudokuHint).mockReset()
  vi.mocked(buildSudokuHint).mockImplementation(() => current.hint)
  const { container } = render(
    <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
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
    select: (cell: { r: number; c: number }) => act(() => cells()[at(cell)].click()),
    press: (label: string) => act(() => pad(label).click()),
    notes: () => act(() => pad("ui.notes").click()),
    reveal: () => {
      act(() => within(container).getByRole("button", { name: /hint/i }).click())
      current.hint = hintOf("place", [[C, [6]]], "second")
    },
    shown: () => (container.textContent ?? "").includes("reason.first"),
    shownSecond: () => (container.textContent ?? "").includes("reason.second"),
    hatched: () =>
      cells().flatMap((cell, index) =>
        cell.style.backgroundImage.includes("repeating-linear-gradient(45deg") ? [index] : []
      ),
  }
}

describe("SudokuPuzzle hint that stays", () => {
  it("keeps the hint when a square is selected", () => {
    const { reveal, select, shown } = setup(hintOf("place", [[A, [1]]]))
    reveal()
    select(B)
    expect(shown()).toBe(true)
  })

  it("keeps the hint when the pencil is toggled", () => {
    const { reveal, notes, shown } = setup(hintOf("place", [[A, [1]]]))
    reveal()
    notes()
    expect(shown()).toBe(true)
  })

  it("keeps showing the hint it revealed, not the one the board would give now", () => {
    const { reveal, select, shownSecond, shown } = setup(hintOf("place", [[A, [1]]]))
    reveal()
    select(B)
    expect(shown()).toBe(true)
    expect(shownSecond()).toBe(false)
  })

  describe("a rule out over several squares", () => {
    const start = () => {
      const view = setup(
        hintOf("ruleOut", [
          [A, [1]],
          [B, [1]],
        ])
      )
      view.select(A)
      view.notes()
      view.press("1")
      view.press("2")
      view.select(B)
      view.press("1")
      view.press("3")
      view.reveal() // selects A, pencil still on
      return view
    }

    it("keeps the hint when one hinted note is rubbed out, and stops marking that square", () => {
      const view = start()
      expect(view.hatched()).toEqual([at(A), at(B)])
      view.press("1")
      expect(view.shown()).toBe(true)
      expect(view.hatched()).toEqual([at(B)])
    })

    it("ends the hint when the last hinted note is rubbed out", () => {
      const view = start()
      view.press("1")
      view.select(B)
      view.press("1")
      expect(view.shown()).toBe(false)
    })

    it("ends the hint when a note the hint did not name is toggled", () => {
      const view = start()
      view.press("4")
      expect(view.shown()).toBe(false)
    })

    it("ends the hint when a note the hint did not name is rubbed out", () => {
      const view = start()
      view.press("2")
      expect(view.shown()).toBe(false)
    })

    it("ends the hint when a digit is entered", () => {
      const view = start()
      view.notes()
      view.press("5")
      expect(view.shown()).toBe(false)
    })
  })

  describe("a place", () => {
    it("ends the hint when the hinted digit is entered in the hinted square", () => {
      const { reveal, press, shown } = setup(hintOf("place", [[A, [4]]]))
      reveal()
      press("4")
      expect(shown()).toBe(false)
    })

    it("ends the hint when the hinted digit is pencilled instead of written", () => {
      const { reveal, notes, press, shown } = setup(hintOf("place", [[A, [4]]]))
      reveal()
      notes()
      press("4")
      expect(shown()).toBe(false)
    })

    it("ends the hint when the hinted digit is pressed twice, so it is written and cleared", () => {
      const { reveal, press, shown } = setup(hintOf("place", [[A, [4]]]))
      reveal()
      press("4")
      press("4")
      expect(shown()).toBe(false)
    })

    it("completes the hint when the hinted square is picked first and the digit entered after", () => {
      const { reveal, select, press, shown } = setup(hintOf("place", [[A, [4]]]))
      reveal()
      select(B)
      expect(shown()).toBe(true)
      select(A)
      expect(shown()).toBe(true)
      press("4")
      expect(shown()).toBe(false)
    })

    it("ends the hint when another digit is entered", () => {
      const { reveal, press, shown } = setup(hintOf("place", [[A, [4]]]))
      reveal()
      press("5")
      expect(shown()).toBe(false)
    })
  })
})
