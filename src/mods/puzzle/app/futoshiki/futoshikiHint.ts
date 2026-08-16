import {
  createFutoshikiBoard,
  firstFutoshikiMistake,
  futoshikiCellKey,
  nextFutoshikiStep,
  type FutoshikiNotes,
  type FutoshikiPuzzleData,
  type FutoshikiStep,
  type FutoshikiValues,
  type TechniqueId,
} from "@/mods/puzzle/game/futoshiki/techniques"

export type FutoshikiHint = {
  /** Translation key under `futoshiki.hint`, plus the numbers that fill its slots. */
  key: string
  params: { value?: number; chain?: number; bound?: number; first?: number; second?: number }
  cells: ReadonlySet<string>
  /** Signs the reason points at, so "the sign says this one is smaller" has something to point to. */
  constraints: ReadonlySet<number>
}

// Several techniques read as a different sentence each way round ("nothing bigger fits" vs "nothing
// smaller"), and the two lines get their own keys as well — a hint that says "row" or "column" is
// easier to act on than one that says "line", and naming the two in a shared slot would break the
// moment a locale inflects around the word.
const stepKey = (step: FutoshikiStep): string => [step.technique, step.variant].filter(Boolean).join(".")

const asHint = (step: FutoshikiStep): FutoshikiHint => ({
  key: stepKey(step),
  params: step.params,
  cells: new Set(step.cells.map(cell => futoshikiCellKey(cell.row, cell.col))),
  constraints: new Set(step.constraint === undefined ? [] : [step.constraint]),
})

/**
 * The next thing to say to the player: a wrong number or a wrong note first, otherwise the cheapest
 * technique that fires. Which techniques are allowed comes from the board's own cap, so a starter
 * board never explains itself with reasoning it was never built to need.
 *
 * The player's notes are read as the narrowing they are, so a hint that tells them to rule a number
 * out only fires while they still hold it — following the advice is what moves the hint on.
 */
export const buildFutoshikiHint = (
  puzzle: FutoshikiPuzzleData,
  values: FutoshikiValues,
  notes: FutoshikiNotes,
  solution: number[][],
  cap: TechniqueId
): FutoshikiHint | undefined => {
  const mistake = firstFutoshikiMistake(values, notes, solution)
  if (mistake)
    return {
      key: `mistake.${mistake.kind}`,
      params: {},
      cells: new Set([futoshikiCellKey(mistake.row, mistake.col)]),
      constraints: new Set<number>(),
    }

  const step = nextFutoshikiStep(puzzle, createFutoshikiBoard(puzzle, values, notes), cap)
  return step && asHint(step)
}
