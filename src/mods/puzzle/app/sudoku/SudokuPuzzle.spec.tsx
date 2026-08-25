import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, within } from "@testing-library/react"
import { act } from "react"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { createSudokuBoard } from "@/mods/puzzle/game/sudoku/techniques"
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

/** The squares washed as holding the value the player picked. */
const twinnedIn = (root: HTMLElement) =>
  cellsIn(root).filter(cell => cell.style.backgroundImage.includes("linear-gradient(rgb"))

/** The squares a hint SETTLES, which the board hatches and its sentence names (§4.2). */
const hatchedIn = (root: HTMLElement) =>
  cellsIn(root).filter(cell => cell.style.backgroundImage.includes("repeating-linear-gradient(45deg"))

const padIn = (root: HTMLElement, label: string) =>
  within(root)
    .queryAllByRole<HTMLButtonElement>("button", { name: label })
    .filter(button => !button.className.includes("aspect-square"))[0]

/** What a square has pencilled in: the note spans that are not the aria-hidden spacers. */
const pencilled = (cell: HTMLElement) =>
  [...cell.querySelectorAll("span.grid > span:not([aria-hidden])")].map(span => span.textContent)

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
   * skin, so the carved board's hint says "4" where the register's says 𓋹 — and a digit appearing over a
   * register would be the one thing on that screen which is not a sign.
   *
   * It is the same character the squares show, which is what the bundled face is for: a hint naming a
   * value is asking the player to go and find it, so the words and the board must show one shape.
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
    // And that is the character standing in its squares, not a second way of naming the same value.
    expect(within(register.container).getAllByText(said![1]).length).toBeGreaterThan(0)
    expect(register.container.textContent).toContain("sudoku.hint.papyrus.")
  })

  /**
   * Picking a value shows the player where else it stands — the question they are actually asking when
   * they tap a square that already holds something.
   */
  describe("the picked value's twins", () => {
    it("washes every square holding it, and only those", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
      )
      expect(twinnedIn(container)).toHaveLength(0) // nothing picked, nothing to match

      // Pick a square the puzzle filled in, so there is certainly a value under it.
      const given = puzzle.givens.flatMap((row, rowIndex) =>
        row.flatMap((value, colIndex) => (value !== undefined ? [{ row: rowIndex, col: colIndex, value }] : []))
      )[0]
      act(() => cellsIn(container)[given.row * 6 + given.col].click())

      const washed = twinnedIn(container).map(cell => cellsIn(container).indexOf(cell))
      const holding = puzzle.givens
        .flatMap((row, rowIndex) => row.map((value, colIndex) => ({ value, at: rowIndex * 6 + colIndex })))
        .filter(cell => cell.value === given.value)
        .map(cell => cell.at)
      expect(washed).toEqual(holding)
      // The square picked is one of its own twins — it is part of the group, and its ring says which
      // one the player is standing on.
      expect(washed).toContain(given.row * 6 + given.col)
    })

    /**
     * The register's sheet already carries a grain in the same channel, and the wash is LAYERED over it
     * rather than swapping it out — so this is the face where the stacking can silently drop one of them.
     */
    it("washes over the sheet's own grain rather than replacing it", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" role="scribe" onSolved={() => {}} onCancel={() => {}} />
      )
      const given = puzzle.givens.flatMap((row, rowIndex) =>
        row.flatMap((value, colIndex) => (value !== undefined ? [{ row: rowIndex, col: colIndex }] : []))
      )[0]
      act(() => cellsIn(container)[given.row * 6 + given.col].click())
      const layers = cellsIn(container)[given.row * 6 + given.col].style.backgroundImage
      expect(layers).toContain("linear-gradient(rgb") // the wash
      expect(layers).toContain("repeating-linear-gradient(90deg") // and the pressed-reed fibre under it
    })

    /**
     * The other half of the same question: not only where the value IS, but where it could still go. So
     * the pair has to be a LIVE option — an empty square the value can still take — which the board's
     * own candidate model is the honest way to find.
     */
    const liveOption = (puzzle: ReturnType<typeof board>) => {
      const candidates = createSudokuBoard(puzzle, puzzle.givens).candidates
      for (let row = 0; row < 6; row++)
        for (let col = 0; col < 6; col++)
          for (const value of candidates[row][col]) {
            const holder = puzzle.givens.flatMap((cells, atRow) =>
              cells.flatMap((held, atCol) => (held === value ? [{ row: atRow, col: atCol }] : []))
            )[0]
            if (holder) return { row, col, value, holder }
          }
      throw new Error("no live option shares a value with a given")
    }

    it("brightens a pencilled copy of the picked value, and leaves the other options alone", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
      )
      const { row, col, value, holder } = liveOption(puzzle)
      const other = [...createSudokuBoard(puzzle, puzzle.givens).candidates[row][col]].find(one => one !== value)!

      act(() => cellsIn(container)[row * 6 + col].click())
      act(() => padIn(container, "✏️ sudoku.notes").click())
      act(() => padIn(container, String(value)).click())
      act(() => padIn(container, String(other)).click())
      act(() => cellsIn(container)[holder.row * 6 + holder.col].click())

      const pencilled = (at: number, of: number) =>
        [...cellsIn(container)[at].querySelectorAll("span.grid > span")].find(
          span => span.textContent === String(of) && !span.hasAttribute("aria-hidden")
        )
      expect(pencilled(row * 6 + col, value)?.className).toContain("font-semibold")
      // The emphasis says nothing unless the options it passes over stay as they were.
      expect(pencilled(row * 6 + col, other)?.className).not.toContain("font-semibold")
    })

    /**
     * And a note the board has already struck through stays struck when it is the picked value. That it
     * cannot go here is the louder of the two facts, so the strike wins over the emphasis.
     */
    it("leaves a struck note struck, even when it is the value picked", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
      )
      // A value taken from a given, pencilled into an empty square of that same row — so it is ruled out.
      const holder = puzzle.givens.flatMap((cells, atRow) =>
        cells.flatMap((held, atCol) => (held !== undefined ? [{ row: atRow, col: atCol, value: held }] : []))
      )[0]
      const empty = puzzle.givens[holder.row].findIndex(held => held === undefined)

      act(() => cellsIn(container)[holder.row * 6 + empty].click())
      act(() => padIn(container, "✏️ sudoku.notes").click())
      act(() => padIn(container, String(holder.value)).click())
      act(() => cellsIn(container)[holder.row * 6 + holder.col].click())

      const struck = [...cellsIn(container)[holder.row * 6 + empty].querySelectorAll("span.grid > span")].find(
        span => span.textContent === String(holder.value) && !span.hasAttribute("aria-hidden")
      )
      expect(struck?.className).toContain("line-through")
      expect(struck?.className).not.toContain("font-semibold")
    })

    it("says nothing when the square picked is empty", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
      )
      const { row, col } = firstEmpty(puzzle)
      act(() => cellsIn(container)[row * 6 + col].click())
      expect(twinnedIn(container)).toHaveLength(0)
    })

    it("follows a value the player writes, not just the ones the puzzle wrote", () => {
      const puzzle = board()
      const { container } = render(
        <SudokuPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
      )
      const before = twinnedIn(container).length
      const { row, col } = firstEmpty(puzzle)
      act(() => cellsIn(container)[row * 6 + col].click())
      act(() => padIn(container, "1").click())
      // The square now holds a 1 and is still picked, so the 1s wash — including this one.
      expect(twinnedIn(container).length).toBeGreaterThan(before)
      expect(twinnedIn(container).map(cell => cellsIn(container).indexOf(cell))).toContain(row * 6 + col)
    })
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
    expect(cell().querySelector("span.inline-block"), "a pencilled value must not stand in the square").toBeNull()

    // The same key again rubs it out.
    act(() => padIn(container, "3").click())
    expect(pencilled(cell())).toEqual([])

    // And with the pencil off, the same key writes the value in for real.
    act(() => padIn(container, "✏️ sudoku.notes").click())
    act(() => padIn(container, "3").click())
    expect(pencilled(cell())).toEqual([])
    expect(cell().querySelector("span.inline-block")?.textContent).toBe("3")
  })
})
