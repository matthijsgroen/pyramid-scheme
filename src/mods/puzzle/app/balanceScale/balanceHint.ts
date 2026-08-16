import {
  firstMistake,
  nextStep,
  type BalanceAssignment,
  type BalancePuzzleData,
  type EquationRef,
  type Glyph,
  type Note,
  type TechniqueId,
} from "@/mods/puzzle/game/balanceScale/techniques"

export type BalanceHint = {
  /** Translation key under `balance.hint`. Its only slot is the glyph the move is about. */
  key: string
  params: { glyph?: Glyph }
  /** The glyph the move is about — lit wherever it stands. Absent for a move about plain stones. */
  glyph?: Glyph
  /** The row(s) the move is made on. Empty for a wrong weight, which is about no one row. */
  refs: EquationRef[]
}

/**
 * The next thing to say to the player: a wrong weight first, otherwise the cheapest technique that
 * fires. Which techniques are allowed comes from the board's own cap, so a starter board never
 * explains itself with reasoning it was never built to need.
 *
 * Two rules the wording depends on, both learned in playtesting (design doc §6):
 *
 * - **A hint names the move, never the weight.** The solver knows what the glyph weighs at every one
 *   of these steps and says none of it. The arithmetic is the part worth doing.
 * - **A hint only talks about rows that are on the board.** The solver used to cancel matching glyphs
 *   silently, so "this is the only glyph left here" described a scale nobody could see. Cancelling is
 *   a move now, and it is the first thing the ladder suggests.
 */
export const buildBalanceHint = (
  puzzle: BalancePuzzleData,
  values: BalanceAssignment,
  notes: Note[],
  solution: Record<Glyph, number>,
  cap: TechniqueId
): BalanceHint | undefined => {
  const mistake = firstMistake(puzzle.glyphs, values, solution)
  if (mistake) return { key: "mistake", params: { glyph: mistake }, glyph: mistake, refs: [] }

  const step = nextStep(puzzle, values, notes, cap)
  if (!step) return undefined
  return { key: step.technique, params: { glyph: step.glyph }, glyph: step.glyph, refs: step.refs }
}
