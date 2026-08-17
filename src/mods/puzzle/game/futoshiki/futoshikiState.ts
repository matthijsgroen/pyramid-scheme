import { current, produce } from "immer"
import type { FutoshikiNotes, FutoshikiPuzzleData, FutoshikiValues } from "./techniques"

// The board as the player leaves it: a number written in, or the numbers they are still weighing up.
// Notes are the same vocabulary the solver reasons in (candidates), so a hint's elimination drops
// straight onto them.
export type FutoshikiCell = {
  value?: number
  /** Ascending, so the pencilled numbers read in order without the board sorting them again. */
  notes: number[]
  given: boolean
}

export type FutoshikiState = {
  cells: FutoshikiCell[][]
  /** Board states this one replaced, oldest first — the undo stack. */
  past: FutoshikiCell[][][]
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createFutoshikiState = (puzzle: FutoshikiPuzzleData): FutoshikiState => ({
  cells: puzzle.givens.map(row => row.map(value => ({ value, notes: [], given: value !== undefined }))),
  past: [],
})

const recordMove = (state: FutoshikiState) => {
  state.past.push(current(state.cells))
  if (state.past.length > UNDO_LIMIT) state.past.shift()
}

/**
 * Writes a number into a cell; the same number again takes it back out.
 *
 * Notes are left exactly as they were, here and everywhere else. Sweeping the pencilled options a
 * placement rules out looked like the bookkeeping a player does on paper, but it threw away work that
 * only undo could return: correcting a number the ordinary way — writing a different one over it —
 * left the swept notes gone for good. The board marks stranded notes instead (futoshikiStatus), so a
 * correction simply re-marks them.
 */
export const setFutoshikiValue = produce((state: FutoshikiState, row: number, col: number, value: number) => {
  const cell = state.cells[row][col]
  if (cell.given) return
  recordMove(state)
  cell.value = cell.value === value ? undefined : value
})

/** Pencils a number in or rubs it out. A cell holding a number has nothing to weigh up. */
export const toggleFutoshikiNote = produce((state: FutoshikiState, row: number, col: number, value: number) => {
  const cell = state.cells[row][col]
  if (cell.given || cell.value !== undefined) return
  recordMove(state)
  const at = cell.notes.indexOf(value)
  if (at === -1) cell.notes = [...cell.notes, value].sort((a, b) => a - b)
  else cell.notes.splice(at, 1)
})

export const clearFutoshikiCell = produce((state: FutoshikiState, row: number, col: number) => {
  const cell = state.cells[row][col]
  if (cell.given || (cell.value === undefined && cell.notes.length === 0)) return
  recordMove(state)
  cell.value = undefined
  cell.notes = []
})

export const undoFutoshikiMove = produce((state: FutoshikiState) => {
  const previous = state.past.pop()
  if (previous) state.cells = previous
})

export const canUndoFutoshiki = (state: FutoshikiState): boolean => state.past.length > 0

export const futoshikiValues = (state: FutoshikiState): FutoshikiValues =>
  state.cells.map(row => row.map(cell => cell.value))

export const futoshikiNotes = (state: FutoshikiState): FutoshikiNotes =>
  state.cells.map(row => row.map(cell => cell.notes))
