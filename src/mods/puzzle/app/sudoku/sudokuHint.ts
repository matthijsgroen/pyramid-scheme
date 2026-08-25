import {
  createSudokuBoard,
  firstSudokuMistake,
  nextSudokuStep,
  sudokuCellKey,
  type SudokuCellRef,
  type SudokuNotes,
  type SudokuPuzzleData,
  type SudokuStep,
  type SudokuValues,
} from "@/mods/puzzle/game/sudoku/techniques"
import { techniquesFor, type DemandId } from "@/mods/puzzle/game/sudoku/demands"

/** What the player is asked to DO about the reason — the second line of a hint (§4.1). */
export type SudokuMove = {
  kind: "place" | "ruleOut"
  value: number
  /** How many squares it settles, so the sentence agrees with what the board has marked. */
  count: number
}

export type SudokuHint = {
  /** Translation key under `sudoku.hint.<skin>.reason`, plus the value that fills its slot. */
  key: string
  params: { value?: number }
  /** Cell keys the move settles — the board hatches these. */
  cells: ReadonlySet<string>
  /** Cell keys the reason argues FROM — the board rings these. */
  evidence: ReadonlySet<string>
  /** The square the reason is about — where the cursor goes, so the pad is already aimed at it. */
  focus: SudokuCellRef
  /** Absent for a mistake, which asks for nothing: the way out of a wrong mark is the player's to find. */
  move?: SudokuMove
}

// Several rungs read as a different sentence per group ("nowhere else in this row" against "nowhere
// else in this chamber"), and each gets its own key rather than a shared one with the group in a slot
// — naming the three in a slot breaks on the first locale that inflects around the word.
const stepKey = (step: SudokuStep): string => [step.technique, step.variant].filter(Boolean).join(".")

const keysOf = (cells: SudokuCellRef[]): Set<string> => new Set(cells.map(cell => sudokuCellKey(cell.row, cell.col)))

const moveOf = (step: SudokuStep): SudokuMove => {
  const placed = step.decisions.find(decision => decision.kind === "place")
  if (placed) return { kind: "place", value: placed.value, count: 1 }
  const ruledOut = step.decisions.filter(decision => decision.kind === "eliminate")
  return {
    kind: "ruleOut",
    // Every elimination a single step makes is about one value on this ladder, so the move names it.
    value: ruledOut[0].values[0],
    count: ruledOut.length,
  }
}

const asHint = (step: SudokuStep): SudokuHint => ({
  key: stepKey(step),
  params: step.params,
  cells: keysOf(step.cells),
  evidence: keysOf(step.evidence ?? []),
  focus: step.cells[0],
  move: moveOf(step),
})

/**
 * The next thing to say to the player: a wrong value or a wrong note first, otherwise the cheapest
 * technique that fires. Which techniques are allowed comes from the board's own tier, so a starter
 * board never explains itself with reasoning it was never built to need.
 *
 * The player's notes are read as the narrowing they are, so a hint that tells them to rule a value
 * out only fires while they still hold it — following the advice is what moves the hint on.
 */
export const buildSudokuHint = (
  puzzle: SudokuPuzzleData,
  values: SudokuValues,
  notes: SudokuNotes,
  solution: number[][],
  cap: DemandId
): SudokuHint | undefined => {
  const mistake = firstSudokuMistake(values, notes, solution)
  if (mistake)
    return {
      key: `mistake.${mistake.kind}`,
      params: {},
      cells: new Set([sudokuCellKey(mistake.row, mistake.col)]),
      evidence: new Set<string>(),
      focus: { row: mistake.row, col: mistake.col },
    }

  const step = nextSudokuStep(createSudokuBoard(puzzle, values, notes), techniquesFor(cap))
  return step && asHint(step)
}
