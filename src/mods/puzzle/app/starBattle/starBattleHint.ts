import { firstStarBattleMistake, type StarBattleMarks } from "@/mods/puzzle/game/starBattle/starBattle"
import { techniquesUpTo, type StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { nextStarBattleStep, stepFocus, type StarBattleStep } from "@/mods/puzzle/game/starBattle/techniques"

/**
 * The star as a glyph rather than a word.
 *
 * A glyph slot keeps a hint language-free (PUZZLE_FAMILIES.md P2), and it is what lets a sentence state the
 * fact it found — "this row has its ⭐, so the rest is dark" — instead of the shape of the deduction.
 */
const STAR = "⭐"

export type StarBattleHint = {
  /** Translation key under `starBattle.hint`. */
  key: string
  params: { star?: string; count?: number }
  /** The squares the reason argues from, so the board can point at what it is reasoning from. */
  cells: ReadonlySet<number>
  /** The square the reason is ABOUT, drawn apart from its evidence — "this square" has to be one square. */
  focus?: number
}

// A rung that reads as a different sentence per group gets a key per reading: a row, a column and a region
// are three different things to point at.
const stepKey = (step: StarBattleStep): string => [step.technique, step.variant].filter(Boolean).join(".")

/**
 * The next thing to say: a wrong mark first, otherwise the cheapest technique that fires.
 *
 * The ladder is the board's own, so a starter board never explains itself with reasoning it was never built
 * to need — and it is read in ladder order rather than a second hint order, because this family's ladder
 * already runs from the reason a player cannot miss to the one they have to hunt for (techniques.ts).
 */
export const buildStarBattleHint = (
  puzzle: StarBattlePuzzleWithAnswer,
  state: StarBattleMarks
): StarBattleHint | undefined => {
  const mistake = firstStarBattleMistake(state.marks, puzzle.solution)
  if (mistake !== undefined) return { key: "mistake", params: {}, cells: new Set([mistake]), focus: mistake }

  const step = nextStarBattleStep(puzzle, [...state.marks], techniquesUpTo(puzzle.techniqueCap))
  if (!step) return undefined
  return {
    key: stepKey(step),
    params: { star: STAR, count: step.count },
    cells: new Set(step.cells),
    focus: stepFocus(step),
  }
}
