import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { generateSudoku, type SudokuPuzzle as SudokuPuzzleData } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SudokuPuzzle } from "./SudokuPuzzle"
import { skinFor } from "./skins"

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

/** The pad's keys, told from the board's squares by not being square. */
const padIn = (root: HTMLElement, token: string) =>
  within(root)
    .queryAllByRole<HTMLButtonElement>("button", { name: token })
    .filter(button => !button.className.includes("aspect-square"))[0]

const settling = (root: HTMLElement) => root.querySelectorAll(".animate-bloom").length

/** The register's own read-back mark, which is a brightening rather than a swell. */
const flaring = (root: HTMLElement) => root.querySelectorAll(".animate-flare").length

const rolls = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".animate-furl")]

/** Which chambers a roll has been laid over, as the grid areas the sheets cover. */
const rolled = (root: HTMLElement) =>
  rolls(root).map(sheet => {
    const chamber = sheet.parentElement as HTMLElement
    return `${chamber.style.gridColumn} / ${chamber.style.gridRow}`
  })

/** Select a square, press the value the answer holds. Givens are already on the board. */
const solve = (root: HTMLElement, puzzle: SudokuPuzzleData, token: (value: number) => string) =>
  puzzle.solution.forEach((row, rowIndex) =>
    row.forEach((value, colIndex) => {
      if (puzzle.givens[rowIndex][colIndex] !== undefined) return
      act(() => cellsIn(root)[rowIndex * puzzle.size + colIndex].click())
      act(() => padIn(root, token(value)).click())
    })
  )

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

const carved = skinFor(undefined, undefined)
const register = skinFor("scribe", undefined)

/**
 * The board reads itself back before the shell hears the word "solved" (`puzzle-screens.md` §3).
 *
 * A tick is a VALUE rather than a square, because that is this family's own claim: each of the six
 * stands once in every row, every column and every chamber, so all six homes of a value settle
 * together. The constraints are the shared ones — under a second, no input while it runs, nothing at
 * all under reduced motion.
 */
describe("the completion run", () => {
  const board = () => generateSudoku(1, SUDOKU_CONFIG.starter)

  it("reads the values back before the banner arrives, then reports the solve", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, carved.token)

    // Mid-run: the low values have had their turn and the high ones have not, so part of the board is settled.
    await waitFor(() => expect(settling(container)).toBeGreaterThan(0))
    expect(settling(container)).toBeLessThan(puzzle.size ** 2)
    expect(within(container).queryByText(/⏱/)).toBeNull()

    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(settling(container)).toBe(puzzle.size ** 2)
  }, 60_000)

  it("settles every square holding one value together, wherever on the board they stand", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, carved.token)
    await waitFor(() => expect(settling(container)).toBeGreaterThan(0))
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
    // And it counts from the bottom: 1 is in, the grid's highest value is not yet.
    expect(litValues.has(1)).toBe(true)
    expect(litValues.has(puzzle.size)).toBe(false)
  }, 60_000)

  it("refuses input while the board is finishing", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, carved.token)
    // The pad is shut and undo with it, so nothing can un-solve a board whose win is already on its way.
    expect(padIn(container, "1").disabled).toBe(true)
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, carved.token)
    expect(settling(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)

  it("plays the same board in signs when the room is a scribe's, pad and all", async () => {
    reducedMotion(true)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" role="scribe" onSolved={() => {}} onCancel={() => {}} />
    )
    // Nothing on this board is a digit: the pad's keys are signs, so the same solve is typed in signs.
    expect(padIn(container, "1")).toBeUndefined()
    solve(container, puzzle, register.token)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)
})

/**
 * **The register finishes another way, and that is the skin's to decide** (`puzzle-screens.md` §3 leaves
 * the look of a run entirely to the family). A sheet is not lit when it is done with, it is rolled up and
 * put away — so each chamber of a solved register is taken up as its own scroll, one after the next.
 *
 * It is the same rule said back either way: the value run lights all six homes of a value at once, and the
 * chamber run takes up a chamber that holds all six. What the roll may NOT do is keep the answer, so each
 * scroll is laid back out — the solved board is the reward and the banner sits over it, readable.
 */
describe("the register filing itself", () => {
  const board = () => generateSudoku(1, SUDOKU_CONFIG.starter)

  /** Three chambers across and two down, each two columns wide and three rows tall. */
  const CHAMBERS = [
    "1 / span 2 / 1 / span 3",
    "3 / span 2 / 1 / span 3",
    "5 / span 2 / 1 / span 3",
    "1 / span 2 / 4 / span 3",
    "3 / span 2 / 4 / span 3",
    "5 / span 2 / 4 / span 3",
  ]

  it("takes its chambers up one at a time, each roll covering one whole chamber", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" role="scribe" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, register.token)

    // Mid-run: some chambers have had their turn and some have not — a run that arrived all at once would
    // be a board blinking rather than a register being filed.
    await waitFor(() => expect(rolls(container).length).toBeGreaterThan(0))
    const partway = rolled(container)
    expect(partway.length).toBeLessThan(CHAMBERS.length)
    // And in reading order, so the wave crosses the sheet rather than picking chambers out of it.
    expect(partway).toEqual(CHAMBERS.slice(0, partway.length))

    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    // Every chamber, and each one covered exactly: a sheet that stopped short of a square would leave a
    // sign standing on the bare table it was just rolled off.
    expect(rolled(container)).toEqual(CHAMBERS)
  }, 60_000)

  it("does not read its values back as well — one board, one way of finishing", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" role="scribe" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, register.token)
    await waitFor(() => expect(rolls(container).length).toBeGreaterThan(0))
    // Two runs at once is two answers to "what just happened", and the value run also rewrites what every
    // unfilled square shows — under a rolling sheet, that would be a board changing where nobody can see.
    expect(flaring(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)

  it("leaves the carved chamber to catch the light instead, since stone does not roll", async () => {
    reducedMotion(false)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, carved.token)
    await waitFor(() => expect(settling(container)).toBeGreaterThan(0))
    expect(rolls(container)).toHaveLength(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)

  it("rolls nothing at all under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const puzzle = board()
    const { container } = render(
      <SudokuPuzzle puzzle={puzzle} difficulty="starter" role="scribe" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle, register.token)
    expect(rolls(container)).toHaveLength(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  }, 60_000)
})
