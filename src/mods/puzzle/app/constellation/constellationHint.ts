import { firstConstellationMistake, type ConstellationLines } from "@/mods/puzzle/game/constellation/constellation"
import {
  techniquesUpTo,
  type ConstellationPuzzleWithAnswer,
} from "@/mods/puzzle/game/constellation/generateConstellation"
import {
  boundsFromLines,
  CONSTELLATION_HINT_ORDER,
  nextConstellationStep,
  type ConstellationStep,
} from "@/mods/puzzle/game/constellation/techniques"

export type ConstellationHint = {
  /** Translation key under `constellation.hint.<place>` — the reason, on its own line. */
  key: string
  /** Slots for the key's template — numbers only, so a hint carries no language (PUZZLE_FAMILIES.md P2). */
  params: { count?: number }
  /** The pairs the reason talks about, so the board can point at what it is reasoning from. */
  pairs: ReadonlySet<number>
  /** The pair the reason is ABOUT, drawn apart from its evidence — "that line" has to be one line. */
  focus?: number
  /** The stars the reason points at: for a sealing reason, the group it would close. */
  stars: ReadonlySet<number>
  /**
   * The move the reason asks for, and how many lines it is about (`puzzle-screens.md` §4.1).
   *
   * Read off the bounds the step decides rather than declared per technique: a rung that pushes a pair's
   * floor up is asking for a line, and one that pulls its ceiling to nought is asking for none. `refuseDouble`
   * is the ceiling landing on one — a line may stand there, but never a second.
   */
  action: { key: "draw" | "refuse" | "refuseDouble"; count: number } | undefined
}

/** What the step's bounds are asking the player to do about them. */
const moveFor = (step: ConstellationStep): ConstellationHint["action"] => {
  const drawing = step.decisions.filter(decision => (decision.min ?? 0) >= 1)
  if (drawing.length) return { key: "draw", count: drawing.length }
  const barred = step.decisions.filter(decision => decision.max === 0)
  if (barred.length) return { key: "refuse", count: barred.length }
  return step.decisions.some(decision => decision.max === 1) ? { key: "refuseDouble", count: 1 } : undefined
}

// A technique that reads as a different sentence each way round gets a key per reading.
const stepKey = (step: ConstellationStep): string => [step.technique, step.variant].filter(Boolean).join(".")

/**
 * The next thing to say to the player: a wrong line first, otherwise the cheapest technique that fires.
 *
 * The ladder is the board's own — a starter sky never explains itself with reasoning it was never built to
 * need — and it is asked in the order a player would spot the reasons rather than in order of strength,
 * because several usually apply at once and the one worth saying is the quickest to see.
 */
export const buildConstellationHint = (
  puzzle: ConstellationPuzzleWithAnswer,
  state: ConstellationLines
): ConstellationHint | undefined => {
  const mistake = firstConstellationMistake(state.lines, puzzle.solution)
  // A wrong line has no move to offer: the way out is the player's to find, and naming it would be naming
  // the answer.
  if (mistake !== undefined)
    return {
      key: "mistake",
      params: {},
      pairs: new Set([mistake]),
      focus: mistake,
      stars: new Set(),
      action: undefined,
    }

  const allowed = techniquesUpTo(puzzle.techniqueCap)
  const step = nextConstellationStep(
    puzzle,
    boundsFromLines(puzzle, state.lines),
    CONSTELLATION_HINT_ORDER.filter(id => allowed.includes(id))
  )
  if (!step) return undefined
  return {
    key: stepKey(step),
    params: { count: step.count },
    pairs: new Set(step.pairs),
    focus: step.decisions[0]?.pair ?? step.pairs[0],
    stars: new Set(step.stars),
    action: moveFor(step),
  }
}
