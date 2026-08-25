import { current, produce } from "immer"
import type { SudokuNotes, SudokuPuzzleData, SudokuValues } from "./techniques"

// The board as the player leaves it: a value written in, or the values they are still weighing up.
// Notes are the same vocabulary the solver reasons in (candidates), so a hint's elimination drops
// straight onto them.
export type SudokuCell = {
  value?: number
  /** Ascending, so the pencilled values read in order without the board sorting them again. */
  notes: number[]
  given: boolean
}

export type SudokuState = {
  cells: SudokuCell[][]
  /** Board states this one replaced, oldest first — the undo stack. */
  past: SudokuCell[][][]
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createSudokuState = (puzzle: SudokuPuzzleData): SudokuState => ({
  cells: puzzle.givens.map(row => row.map(value => ({ value, notes: [], given: value !== undefined }))),
  past: [],
})

const recordMove = (state: SudokuState) => {
  state.past.push(current(state.cells))
  if (state.past.length > UNDO_LIMIT) state.past.shift()
}

/**
 * Writes a value into a square; the same value again takes it back out.
 *
 * Notes are left exactly as they were, here and everywhere else. Sweeping the pencilled options a
 * placement rules out looked like the bookkeeping a player does on paper, but it throws away work
 * that only undo could return: correcting a value the ordinary way — writing a different one over it
 * — leaves the swept notes gone for good. The board marks stranded notes instead (sudokuStatus), so a
 * correction simply re-marks them.
 */
export const setSudokuValue = produce((state: SudokuState, row: number, col: number, value: number) => {
  const cell = state.cells[row][col]
  if (cell.given) return
  recordMove(state)
  cell.value = cell.value === value ? undefined : value
})

/** Pencils a value in or rubs it out. A square holding a value has nothing to weigh up. */
export const toggleSudokuNote = produce((state: SudokuState, row: number, col: number, value: number) => {
  const cell = state.cells[row][col]
  if (cell.given || cell.value !== undefined) return
  recordMove(state)
  const at = cell.notes.indexOf(value)
  if (at === -1) cell.notes = [...cell.notes, value].sort((a, b) => a - b)
  else cell.notes.splice(at, 1)
})

export const clearSudokuCell = produce((state: SudokuState, row: number, col: number) => {
  const cell = state.cells[row][col]
  if (cell.given || (cell.value === undefined && cell.notes.length === 0)) return
  recordMove(state)
  cell.value = undefined
  cell.notes = []
})

export const undoSudokuMove = produce((state: SudokuState) => {
  const previous = state.past.pop()
  if (previous) state.cells = previous
})

export const canUndoSudoku = (state: SudokuState): boolean => state.past.length > 0

export const sudokuValues = (state: SudokuState): SudokuValues => state.cells.map(row => row.map(cell => cell.value))

export const sudokuNotes = (state: SudokuState): SudokuNotes => state.cells.map(row => row.map(cell => cell.notes))
