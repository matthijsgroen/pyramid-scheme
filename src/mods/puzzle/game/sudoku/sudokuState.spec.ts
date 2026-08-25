import { describe, expect, it } from "vitest"
import {
  canUndoSudoku,
  clearSudokuCell,
  createSudokuState,
  setSudokuValue,
  sudokuNotes,
  sudokuValues,
  toggleSudokuNote,
  undoSudokuMove,
} from "./sudokuState"
import type { SudokuPuzzleData } from "./techniques"

const blank = () => Array.from({ length: 6 }, () => new Array<number | undefined>(6).fill(undefined))

const puzzle = (): SudokuPuzzleData => {
  const givens = blank()
  givens[0][0] = 4
  return { size: 6, boxWidth: 2, boxHeight: 3, givens }
}

describe("a board as the player leaves it", () => {
  it("starts as the puzzle wrote it, with the pre-filled squares marked as its own", () => {
    const state = createSudokuState(puzzle())
    expect(state.cells[0][0]).toEqual({ value: 4, notes: [], given: true })
    expect(state.cells[0][1]).toEqual({ value: undefined, notes: [], given: false })
  })

  it("writes a value in, and takes the same value back out", () => {
    const written = setSudokuValue(createSudokuState(puzzle()), 1, 1, 3)
    expect(sudokuValues(written)[1][1]).toBe(3)
    expect(sudokuValues(setSudokuValue(written, 1, 1, 3))[1][1]).toBeUndefined()
    // A different value overwrites rather than toggling, which is how a correction is made.
    expect(sudokuValues(setSudokuValue(written, 1, 1, 5))[1][1]).toBe(5)
  })

  it("refuses to touch a square the puzzle wrote", () => {
    const state = createSudokuState(puzzle())
    expect(setSudokuValue(state, 0, 0, 2)).toBe(state)
    expect(toggleSudokuNote(state, 0, 0, 2)).toBe(state)
    expect(clearSudokuCell(state, 0, 0)).toBe(state)
  })

  it("keeps pencilled values in order, and rubs one out on a second tap", () => {
    let state = createSudokuState(puzzle())
    state = toggleSudokuNote(state, 2, 2, 5)
    state = toggleSudokuNote(state, 2, 2, 1)
    expect(sudokuNotes(state)[2][2]).toEqual([1, 5])
    expect(sudokuNotes(toggleSudokuNote(state, 2, 2, 5))[2][2]).toEqual([1])
  })

  it("has nothing to weigh up in a square already holding a value", () => {
    const written = setSudokuValue(createSudokuState(puzzle()), 3, 3, 2)
    expect(toggleSudokuNote(written, 3, 3, 6)).toBe(written)
  })

  /**
   * A placement leaves the notes alone, here and everywhere else. Sweeping the options it rules out
   * looks like the bookkeeping a player does on paper, but it throws away work only undo could
   * return: correcting a value the ordinary way — writing a different one over it — would leave the
   * swept notes gone for good. The board marks stranded notes instead (sudokuStatus).
   */
  it("leaves the pencilled options standing when a value is written elsewhere", () => {
    let state = createSudokuState(puzzle())
    state = toggleSudokuNote(state, 1, 1, 3)
    state = setSudokuValue(state, 1, 2, 3)
    expect(sudokuNotes(state)[1][1]).toEqual([3])
  })

  it("clears a square of both the value and the pencil marks", () => {
    let state = createSudokuState(puzzle())
    state = toggleSudokuNote(state, 4, 4, 2)
    state = setSudokuValue(state, 4, 4, 6)
    state = clearSudokuCell(state, 4, 4)
    expect(sudokuValues(state)[4][4]).toBeUndefined()
    expect(sudokuNotes(state)[4][4]).toEqual([])
  })

  it("takes back the last move, and knows when there is nothing to take back", () => {
    const start = createSudokuState(puzzle())
    expect(canUndoSudoku(start)).toBe(false)
    const written = setSudokuValue(start, 5, 5, 1)
    expect(canUndoSudoku(written)).toBe(true)
    expect(sudokuValues(undoSudokuMove(written))).toEqual(sudokuValues(start))
  })

  it("counts a refused move as no move, so undo does not swallow the one before it", () => {
    let state = setSudokuValue(createSudokuState(puzzle()), 5, 5, 1)
    state = setSudokuValue(state, 0, 0, 2) // a given: refused
    expect(sudokuValues(undoSudokuMove(state))[5][5]).toBeUndefined()
  })

  it("winds all the way back to the board it started from", () => {
    const start = createSudokuState(puzzle())
    let state = start
    for (const [row, col, value] of [
      [1, 1, 2],
      [2, 2, 3],
      [3, 3, 4],
    ])
      state = setSudokuValue(state, row, col, value)
    for (let move = 0; move < 3; move++) state = undoSudokuMove(state)
    expect(state.cells).toEqual(start.cells)
    expect(canUndoSudoku(state)).toBe(false)
  })
})
