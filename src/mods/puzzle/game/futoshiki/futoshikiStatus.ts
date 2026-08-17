import {
  constraintEnds,
  futoshikiCellKey,
  type FutoshikiNotes,
  type FutoshikiPuzzleData,
  type FutoshikiValues,
} from "./techniques"

export type FutoshikiConflicts = {
  /** Cell keys showing a number that repeats in its row or column. */
  cells: ReadonlySet<string>
  /** Indices of signs the two numbers beside them read the wrong way round. */
  constraints: ReadonlySet<number>
}

// Live feedback with nothing to read: a repeat and a sign pointing the wrong way both show themselves
// the moment they are written, the way a satisfied line does in the other grid families.
export const futoshikiConflicts = (puzzle: FutoshikiPuzzleData, values: FutoshikiValues): FutoshikiConflicts => {
  const cells = new Set<string>()
  for (let i = 0; i < puzzle.size; i++)
    for (let j = 0; j < puzzle.size; j++)
      for (let k = j + 1; k < puzzle.size; k++) {
        if (values[i][j] !== undefined && values[i][j] === values[i][k]) {
          cells.add(futoshikiCellKey(i, j))
          cells.add(futoshikiCellKey(i, k))
        }
        if (values[j][i] !== undefined && values[j][i] === values[k][i]) {
          cells.add(futoshikiCellKey(j, i))
          cells.add(futoshikiCellKey(k, i))
        }
      }

  const constraints = new Set<number>()
  puzzle.constraints.forEach((constraint, index) => {
    const { lesser, greater } = constraintEnds(constraint)
    const low = values[lesser.row][lesser.col]
    const high = values[greater.row][greater.col]
    if (low !== undefined && high !== undefined && low > high) constraints.add(index)
  })

  return { cells, constraints }
}

export const isFutoshikiSolved = (puzzle: FutoshikiPuzzleData, values: FutoshikiValues): boolean => {
  if (!values.every(row => row.every(value => value !== undefined))) return false
  const conflicts = futoshikiConflicts(puzzle, values)
  return conflicts.cells.size === 0 && conflicts.constraints.size === 0
}

/** A pencilled number and the square holding it, as `"row,col,value"`. */
export const futoshikiNoteKey = (row: number, col: number, value: number): string => `${row},${col},${value}`

/**
 * Pencilled numbers that a number written somewhere else in their row or column has since ruled out.
 * The board dims and reddens these rather than deleting them: a note is the player's own record of
 * their reasoning, and a placement — which may itself be wrong and get corrected — has no business
 * erasing it.
 */
export const strandedNotes = (
  puzzle: FutoshikiPuzzleData,
  values: FutoshikiValues,
  notes: FutoshikiNotes
): ReadonlySet<string> => {
  const stranded = new Set<string>()
  for (let row = 0; row < puzzle.size; row++)
    for (let col = 0; col < puzzle.size; col++) {
      if (values[row][col] !== undefined) continue
      const taken = new Set<number>()
      for (let i = 0; i < puzzle.size; i++) {
        const inRow = values[row][i]
        const inCol = values[i][col]
        if (inRow !== undefined) taken.add(inRow)
        if (inCol !== undefined) taken.add(inCol)
      }
      for (const value of notes[row][col]) if (taken.has(value)) stranded.add(futoshikiNoteKey(row, col, value))
    }
  return stranded
}
