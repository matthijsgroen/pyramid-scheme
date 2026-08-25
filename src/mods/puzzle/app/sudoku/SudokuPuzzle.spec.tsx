import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, within } from "@testing-library/react"
import { act } from "react"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { SudokuPuzzle } from "./SudokuPuzzle"

/**
 * `t` echoes its interpolation instead of translating.
 *
 * What is worth proving here is the WIRING — which key the screen composes, and what it hands that key
 * to fill its slots with. That those keys resolve to real sentences in both languages is proven where
 * it can be, against the shipped locale files: `goalWording.spec.ts` for every rung of both faces, and
 * `plurals.spec.ts` through a real i18next for the forms that agree with a count.
 */
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  }),
}))

// The shell scrolls a revealed hint into view, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

/** The squares a hint SETTLES, which the board hatches and its sentence names (§4.2). */
const hatchedIn = (root: HTMLElement) =>
  cellsIn(root).filter(cell => cell.style.backgroundImage.includes("repeating-linear-gradient(45deg"))

const padIn = (root: HTMLElement, label: string) =>
  within(root)
    .queryAllByRole<HTMLButtonElement>("button", { name: label })
    .filter(button => !button.className.includes("aspect-square"))[0]

/** What a square has pencilled in: the note spans that are not the aria-hidden spacers. */
const pencilled = (cell: HTMLElement) =>
  [...cell.querySelectorAll("span[class*='24cqw'] > span:not([aria-hidden])")].map(span => span.textContent)

const reveal = (root: HTMLElement) => act(() => within(root).getByRole("button", { name: /hint/i }).click())

const firstEmpty = (puzzle: ReturnType<typeof generateSudoku>) => {
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 6; col++) if (puzzle.givens[row][col] === undefined) return { row, col }
  throw new Error("a board with nothing to fill in")
}

const board = () => generateSudoku(1, SUDOKU_CONFIG.expert)

describe("SudokuPuzzle", () => {
  it("says nothing about the board until a hint is asked for, then marks what it names", () => {
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
    )
    // Nothing is hatched while no hint is on screen — the marking is the hint's, not the board's.
    expect(hatchedIn(container)).toHaveLength(0)

    reveal(container)
    const shown = container.textContent ?? ""
    expect(shown).toContain("sudoku.hint.default.reason.")
    // A reason and a MOVE, which is the two-line rule: a reason alone leaves the player working out
    // what it wants of them (`puzzle-screens.md` §4.1).
    expect(shown).toContain("sudoku.hint.default.action.")
    // And the squares the move talks about are marked, so "the hatched squares" has a referent.
    expect(hatchedIn(container).length).toBeGreaterThan(0)
  })

  it("aims the board at the square the hint is about, so the pad is already there", () => {
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
    )
    expect(padIn(container, "1").disabled).toBe(true) // nothing picked, so a value has nowhere to go
    reveal(container)
    expect(padIn(container, "1").disabled).toBe(false)
  })

  /**
   * The token, end to end. A value is a position in the rules; what a SENTENCE says it is belongs to the
   * skin, so the carved board's hint says "4" where the register's says the sign 𓈖 — and a digit
   * appearing over a register would be the one thing on that screen which is not a sign.
   */
  it("fills its sentences with the face's own token", () => {
    const puzzle = board()
    const carved = render(<SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />)
    reveal(carved.container)
    const digits = (carved.container.textContent ?? "").match(/"token":"(\d)"/)
    expect(digits, "the carved board should name a value as a figure").not.toBeNull()

    const register = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="expert" role="scribe" onSolved={() => {}} onCancel={() => {}} />
    )
    reveal(register.container)
    const said = (register.container.textContent ?? "").match(/"token":"(.+?)"/)
    expect(said).not.toBeNull()
    expect(said![1].codePointAt(0)).toBeGreaterThanOrEqual(0x13000)
    expect(register.container.textContent).toContain("sudoku.hint.papyrus.")
  })

  it("pencils a value in rather than writing it, while the pencil is on", () => {
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
    )
    const { row, col } = firstEmpty(puzzle)
    const cell = () => cellsIn(container)[row * 6 + col]
    act(() => cell().click())
    act(() => padIn(container, "✏️ sudoku.notes").click())
    act(() => padIn(container, "3").click())

    // Every value keeps a place in the square whether pencilled or not, so a note does not move when
    // its neighbour is rubbed out — the unwritten ones are aria-hidden spacers. What is PENCILLED is
    // therefore what is not hidden, and reading the grid's text would only ever say "123456".
    expect(pencilled(cell())).toEqual(["3"])
    expect(cell().querySelector(".text-\\[54cqw\\]"), "a pencilled value must not stand in the square").toBeNull()

    // The same key again rubs it out.
    act(() => padIn(container, "3").click())
    expect(pencilled(cell())).toEqual([])

    // And with the pencil off, the same key writes the value in for real.
    act(() => padIn(container, "✏️ sudoku.notes").click())
    act(() => padIn(container, "3").click())
    expect(pencilled(cell())).toEqual([])
    expect(cell().querySelector(".text-\\[54cqw\\]")?.textContent).toBe("3")
  })
})
