import type { Formula } from "@/game/formulas/formulas"

/**
 * What the crocodile guarding a column wants of the stones in it — the biggest answer, or the smallest.
 *
 * A superlative over the stones ahead, deliberately not a comparison with the stone underfoot: the
 * player is told what THIS crocodile wants and can answer it from the row in front of them, without
 * holding the last row in their head or reading a direction off a symbol.
 */
export type Sign = "biggest" | "smallest"

/** A stone carries its sum and the value that sum works out to — every rule here is about the value. */
export type Stone = { formula: Formula; value: number }

export type CrossingPuzzle = {
  /** columns[0] is the first row out of the near bank; the last is the one that reaches the far bank. */
  columns: Stone[][]
  /** One per column: what the crocodile in front of that column wants. */
  signs: Sign[]
}

/** The stones stepped on so far, one index per column crossed. Empty = still on the near bank. */
export type CrossingPath = number[]

export const isSolved = (puzzle: CrossingPuzzle, path: CrossingPath): boolean => path.length === puzzle.columns.length

/**
 * The one stone in the column the player is facing that its crocodile accepts.
 *
 * Every column has exactly one answer and every board is crossable, so there are no dead ends and
 * nothing to plan around: the whole of the puzzle is working the sums out before the finger moves.
 * Values within a column are distinct by construction (see the generator), so there is never a tie.
 */
export const wantedStep = (puzzle: CrossingPuzzle, path: CrossingPath): number | undefined => {
  const column = puzzle.columns[path.length]
  if (!column) return undefined
  const wantsBiggest = puzzle.signs[path.length] === "biggest"
  return column.reduce(
    (best, stone, index) =>
      (wantsBiggest ? stone.value > column[best].value : stone.value < column[best].value) ? index : best,
    0
  )
}

/**
 * How far the winning stone of each column stands clear of its nearest rival — the generator's gate.
 *
 * A column whose answer beats the rest by a mile is readable from the size of the numbers written on
 * it, and nobody works a sum out to pick it. Keeping the margin small is what forces the arithmetic.
 */
export const winningMargins = (puzzle: CrossingPuzzle): number[] =>
  puzzle.columns.map((column, index) => {
    const values = column.map(stone => stone.value).sort((a, b) => a - b)
    return puzzle.signs[index] === "biggest"
      ? values[values.length - 1] - values[values.length - 2]
      : values[1] - values[0]
  })
