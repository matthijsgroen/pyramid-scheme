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
  /** Translation key under `starBattle.hint` — the REASON, on its own line. */
  key: string
  params: { star?: string; count?: number }
  /**
   * What to do about it, as a key under `starBattle.hint.action`.
   *
   * A second line, and an imperative one. The reason alone leaves the player to work out what it wants of
   * them, which is a step they should not have to take from a hint they already asked for — and it names the
   * squares by how the board draws them, so there is nothing to match up.
   */
  action: "ruleOut" | "place" | undefined
  /** How many squares the move settles — the `count` the action line pluralises on. */
  settles: number
  /** The squares the reason argues from, so the board can point at what it is reasoning from. */
  cells: ReadonlySet<number>
  /**
   * Every square the step settles.
   *
   * A rung here often decides a whole row at once and its sentence says so, so the board rings all of them —
   * with the focus strongest. One ring under "the rest of the row is empty" says less than the sentence does.
   */
  decided: ReadonlySet<number>
  /** The square the reason is ABOUT, drawn strongest — "this square" has to be one square. */
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
  // A wrong mark has no action to offer: the move is the player's to take back, and saying which way would
  // be saying the answer.
  if (mistake !== undefined)
    return {
      key: "mistake",
      params: {},
      action: undefined,
      settles: 1,
      cells: new Set(),
      decided: new Set([mistake]),
      focus: mistake,
    }

  const step = nextStarBattleStep(puzzle, [...state.marks], techniquesUpTo(puzzle.techniqueCap))
  if (!step) return undefined
  return {
    key: stepKey(step),
    params: { star: STAR, count: step.count },
    action: step.decisions[0]?.mark === "star" ? "place" : "ruleOut",
    // How many squares the move is about, so "the hatched square" and "the hatched squares" both read.
    settles: step.decisions.length,
    cells: new Set(step.cells),
    decided: new Set(step.decisions.map(decision => decision.cell)),
    focus: stepFocus(step),
  }
}
