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
  /** Translation key under `constellation.hint`. */
  key: string
  /** Slots for the key's template — numbers only, so a hint carries no language (PUZZLE_FAMILIES.md P2). */
  params: { count?: number }
  /** The pairs the reason talks about, so the board can point at what it is reasoning from. */
  pairs: ReadonlySet<number>
  /** The pair the reason is ABOUT, drawn apart from its evidence — "that line" has to be one line. */
  focus?: number
  /** The stars the reason points at: for a sealing reason, the group it would close. */
  stars: ReadonlySet<number>
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
  if (mistake !== undefined)
    return { key: "mistake", params: {}, pairs: new Set([mistake]), focus: mistake, stars: new Set() }

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
  }
}
