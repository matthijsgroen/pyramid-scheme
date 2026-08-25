import { describe, expect, it } from "vitest"
import { isSudokuSolved, strandedNotes, sudokuConflicts, sudokuNoteKey } from "./sudokuStatus"
import { sudokuCellKey, type SudokuPuzzleData, type SudokuValues } from "./techniques"
import { generateSudoku } from "./generateSudoku"
import { SUDOKU_CONFIG } from "./sudokuConfig"

const shape: SudokuPuzzleData = {
  size: 6,
  boxWidth: 2,
  boxHeight: 3,
  givens: Array.from({ length: 6 }, () => new Array<number | undefined>(6).fill(undefined)),
}

const blank = (): SudokuValues => Array.from({ length: 6 }, () => new Array<number | undefined>(6).fill(undefined))

const noNotes = () => Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => [] as number[]))

describe("what the board shows about itself", () => {
  it("marks a value standing twice in one row", () => {
    const values = blank()
    values[0][0] = 3
    values[0][4] = 3
    expect(sudokuConflicts(shape, values)).toEqual(new Set([sudokuCellKey(0, 0), sudokuCellKey(0, 4)]))
  })

  it("marks a value standing twice in one column", () => {
    const values = blank()
    values[0][2] = 5
    values[4][2] = 5
    expect(sudokuConflicts(shape, values)).toEqual(new Set([sudokuCellKey(0, 2), sudokuCellKey(4, 2)]))
  })

  /** The rule the chambers add, and the one a Latin square would miss entirely. */
  it("marks a value standing twice in one chamber, on different rows and columns", () => {
    const values = blank()
    values[0][0] = 6
    values[2][1] = 6
    expect(sudokuConflicts(shape, values)).toEqual(new Set([sudokuCellKey(0, 0), sudokuCellKey(2, 1)]))
  })

  it("says nothing about a board with no repeat on it", () => {
    const values = blank()
    values[0][0] = 1
    values[3][2] = 1
    expect(sudokuConflicts(shape, values).size).toBe(0)
  })

  it("calls a board solved only once it is full and clean", () => {
    const board = generateSudoku(1, SUDOKU_CONFIG.starter)
    expect(isSudokuSolved(board, board.solution)).toBe(true)
    const missing = board.solution.map(row => [...row]) as SudokuValues
    missing[0][0] = undefined
    expect(isSudokuSolved(board, missing)).toBe(false)
    const wrong = board.solution.map(row => [...row]) as SudokuValues
    wrong[0][0] = board.solution[0][1]
    expect(isSudokuSolved(board, wrong)).toBe(false)
  })
})

describe("pencilled values a placement has since ruled out", () => {
  it("strikes a note its row, column or chamber has taken", () => {
    const values = blank()
    values[0][5] = 2 // the same row
    values[5][0] = 3 // the same column
    values[2][1] = 4 // the same chamber
    const notes = noNotes()
    notes[0][0] = [2, 3, 4, 5]
    expect(strandedNotes(shape, values, notes)).toEqual(
      new Set([sudokuNoteKey(0, 0, 2), sudokuNoteKey(0, 0, 3), sudokuNoteKey(0, 0, 4)])
    )
  })

  it("leaves the notes of a square that already holds a value alone", () => {
    const values = blank()
    values[0][0] = 1
    values[0][5] = 2
    const notes = noNotes()
    notes[0][0] = [2]
    expect(strandedNotes(shape, values, notes).size).toBe(0)
  })
})
