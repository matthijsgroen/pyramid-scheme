import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { FUTOSHIKI_CONFIG } from "@/mods/puzzle/game/futoshiki/futoshikiConfig"
import {
  generateFutoshiki,
  type FutoshikiPuzzle as FutoshikiPuzzleData,
} from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

/** The pad's number keys, told from the board's squares by not being square. */
const padIn = (root: HTMLElement, value: number) =>
  within(root)
    .getAllByRole<HTMLButtonElement>("button", { name: String(value) })
    .filter(button => !button.className.includes("aspect-square"))[0]

const swelling = (root: HTMLElement) => root.querySelectorAll(".animate-bloom").length

/** Select a square, press the number the answer holds. Givens are already on the board. */
const solve = (root: HTMLElement, puzzle: FutoshikiPuzzleData) =>
  puzzle.solution.forEach((row, rowIndex) =>
    row.forEach((value, colIndex) => {
      if (puzzle.givens[rowIndex][colIndex] !== undefined) return
      act(() => cellsIn(root)[rowIndex * puzzle.size + colIndex].click())
      act(() => padIn(root, value).click())
    })
  )

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

/** What each square is showing, in board order — the roll makes this differ from the answer mid-run. */
const shown = (root: HTMLElement) => cellsIn(root).map(cell => Number(cell.textContent))

/**
 * The board finishes itself before the shell hears the word "solved" (`puzzle-screens.md` §3).
 *
 * Here the run COUNTS UP: the whole grid rolls to 1, the squares that really are 1 keep it and swell, the rest
 * roll on to 2, and so on — because order is what this family is about. The constraints are the shared ones:
 * under a second, no input while it runs, nothing at all under reduced motion.
 */
describe("the completion run", () => {
  it("counts the numbers up before the banner arrives, then reports the solve", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateFutoshiki(4, 3, FUTOSHIKI_CONFIG.starter)
    const { container } = render(
      <FutoshikiPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)

    // Mid-run: the low numbers have had their turn and the high ones have not, so part of the board is lit.
    await waitFor(() => expect(swelling(container)).toBeGreaterThan(0))
    expect(swelling(container)).toBeLessThan(puzzle.size ** 2)
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — every number has counted, the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(swelling(container)).toBe(puzzle.size ** 2)
  })

  it("rolls the unsettled squares to the count while the settled ones keep their own number", async () => {
    reducedMotion(false)
    const puzzle = generateFutoshiki(4, 3, FUTOSHIKI_CONFIG.starter)
    const { container } = render(
      <FutoshikiPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Mid-roll the board is NOT the answer: a square whose number has not come up yet shows the count, so
    // every unsettled square shows the same digit.
    await waitFor(() => expect(swelling(container)).toBeGreaterThan(0))
    const answer = puzzle.solution.flat()
    const board = shown(container)
    const count = Math.max(...board.filter((value, cell) => value !== answer[cell]), 0)
    expect(count).toBeGreaterThan(0) // the roll is on, so some square is showing the count rather than itself
    board.forEach((value, cell) => expect(value).toBe(answer[cell] > count ? count : answer[cell]))
  })

  it("counts up rather than across: every square holding the same number takes its turn together", async () => {
    reducedMotion(false)
    const puzzle = generateFutoshiki(4, 3, FUTOSHIKI_CONFIG.starter)
    const { container } = render(
      <FutoshikiPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Whatever the run has reached, it is a set of NUMBERS: a square is lit exactly when every square
    // holding its number is, wherever on the board they stand.
    await waitFor(() => expect(swelling(container)).toBeGreaterThan(0))
    const lit = cellsIn(container).map(cell => !!cell.querySelector(".animate-bloom"))
    const litValues = new Set(
      puzzle.solution.flatMap((row, rowIndex) =>
        row.filter((_value, colIndex) => lit[rowIndex * puzzle.size + colIndex])
      )
    )
    expect(litValues.size).toBeGreaterThan(0)
    puzzle.solution.forEach((row, rowIndex) =>
      row.forEach((value, colIndex) => expect(lit[rowIndex * puzzle.size + colIndex]).toBe(litValues.has(value)))
    )
    // And it counts from the bottom: 1 is in, the grid's highest number is not yet.
    expect(litValues.has(1)).toBe(true)
    expect(litValues.has(puzzle.size)).toBe(false)
  })

  it("refuses input while the board is finishing", async () => {
    reducedMotion(false)
    const puzzle = generateFutoshiki(4, 3, FUTOSHIKI_CONFIG.starter)
    const { container } = render(
      <FutoshikiPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // The pad is shut and undo with it, so nothing can un-solve a board whose win is already on its way.
    expect(padIn(container, 1).disabled).toBe(true)
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const puzzle = generateFutoshiki(4, 3, FUTOSHIKI_CONFIG.starter)
    const { container } = render(
      <FutoshikiPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    expect(swelling(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
