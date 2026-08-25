import {
  peersOf,
  sudokuCellKey,
  unitsOf,
  type SudokuNotes,
  type SudokuPuzzleData,
  type SudokuValues,
} from "./techniques"

// Live feedback with nothing to read: a value standing twice in one row, column or chamber shows
// itself the moment it is written, the way a satisfied line does in the other grid families.
export const sudokuConflicts = (puzzle: SudokuPuzzleData, values: SudokuValues): ReadonlySet<string> => {
  const clashing = new Set<string>()
  for (const unit of unitsOf(puzzle))
    for (let i = 0; i < unit.cells.length; i++)
      for (let j = i + 1; j < unit.cells.length; j++) {
        const one = unit.cells[i]
        const other = unit.cells[j]
        const held = values[one.row][one.col]
        if (held !== undefined && held === values[other.row][other.col]) {
          clashing.add(sudokuCellKey(one.row, one.col))
          clashing.add(sudokuCellKey(other.row, other.col))
        }
      }
  return clashing
}

export const isSudokuSolved = (puzzle: SudokuPuzzleData, values: SudokuValues): boolean =>
  values.every(row => row.every(value => value !== undefined)) && sudokuConflicts(puzzle, values).size === 0

/** A pencilled value and the square holding it, as `"row,col,value"`. */
export const sudokuNoteKey = (row: number, col: number, value: number): string => `${row},${col},${value}`

/**
 * Pencilled values that a value written elsewhere in their row, column or chamber has since ruled
 * out. The board dims and strikes these rather than deleting them: a note is the player's own record
 * of their reasoning, and a placement — which may itself be wrong and get corrected — has no business
 * erasing it.
 */
export const strandedNotes = (
  puzzle: SudokuPuzzleData,
  values: SudokuValues,
  notes: SudokuNotes
): ReadonlySet<string> => {
  const stranded = new Set<string>()
  for (let row = 0; row < puzzle.size; row++)
    for (let col = 0; col < puzzle.size; col++) {
      if (values[row][col] !== undefined) continue
      const taken = new Set<number>()
      for (const peer of peersOf(puzzle, row, col)) {
        const held = values[peer.row][peer.col]
        if (held !== undefined) taken.add(held)
      }
      for (const value of notes[row][col]) if (taken.has(value)) stranded.add(sudokuNoteKey(row, col, value))
    }
  return stranded
}
