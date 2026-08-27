import { mulberry32 } from "@/game/random"
import type { Grade } from "@/game/families/familyMeta"
import {
  gcd,
  isReachable,
  openingGap,
  playLine,
  shortestLine,
  type Capacities,
  type CanistersPuzzle,
  type Volumes,
} from "./canisters"

export type CanistersOptions = {
  /** How many volumes are asked for in turn. Depth comes from legs, never from a third canister (§5). */
  legs: number
  /** The larger canister's ceiling. */
  maxCapacity: number
  /**
   * How much worse the wrong opening has to be, in moves.
   *
   * The generator's real gate (§3): a target whose two directions cost about the same is a coin flip, so
   * the budget punishes nothing and the board teaches nothing. Measured over 68 reachable targets, 76%
   * clear a gap of 4.
   */
  minGap: number
  /** Slack on top of the optimal line, in moves. Starter is forgiving; everything above is exact. */
  slack?: number
  /**
   * The shortest a leg's own line may be.
   *
   * Without it the generator happily returns a two-move board with a wide gap, which clears every gate
   * and is not a puzzle: the player pours twice and it is over before the opening cost them anything.
   */
  minLine: number
}

const MAX_ATTEMPTS = 400
const EMPTY: Volumes = [0, 0]

/** Capacity pairs worth drawing from: coprime-ish, both above 2, and the smaller genuinely smaller. */
const pairsUpTo = (maxCapacity: number): Capacities[] => {
  const out: Capacities[] = []
  for (let small = 3; small < maxCapacity; small++)
    for (let large = small + 1; large <= maxCapacity; large++) {
      // A pair whose gcd is the small canister measures nothing the small one does not already hold:
      // every reachable volume is a multiple of it, so the pouring is bookkeeping.
      if (gcd(small, large) === small) continue
      out.push([small, large])
    }
  return out
}

/**
 * Draw-and-measure (§3). A board is a capacity pair, a run of targets, and a budget; nothing is carved
 * and nothing is hidden, so generation cannot fail on solvability — only on being too easy.
 */
export const generateCanisters = (seed: number, options: CanistersOptions): CanistersPuzzle => {
  const random = mulberry32(seed)
  const { legs, maxCapacity, minGap, minLine, slack = 0 } = options
  const pairs = pairsUpTo(maxCapacity)

  let nearest: CanistersPuzzle | undefined
  let nearestScore = -Infinity
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const capacities = pairs[Math.floor(random() * pairs.length)]
    const targets: number[] = []
    let at: Volumes = EMPTY
    let budget = 0
    let worstGap = Infinity
    let shortestLeg = Infinity

    for (let leg = 0; leg < legs; leg++) {
      const reachable = Array.from({ length: Math.max(...capacities) }, (_unused, index) => index + 1).filter(
        volume => isReachable(capacities, volume) && !at.includes(volume)
      )
      if (reachable.length === 0) break
      const target = reachable[Math.floor(random() * reachable.length)]
      const line = shortestLine(capacities, at, target)
      if (line === null || line.length === 0) break
      worstGap = Math.min(worstGap, openingGap(capacities, at, target))
      shortestLeg = Math.min(shortestLeg, line.length)
      targets.push(target)
      budget += line.length
      at = playLine(capacities, at, line)
    }

    if (targets.length < legs) continue
    const puzzle: CanistersPuzzle = { capacities, targets, budget: budget + slack }
    if (worstGap >= minGap && shortestLeg >= minLine) return puzzle
    // Keep the BEST miss rather than the first, so a tier whose gates are hard to hit still comes out
    // as close to them as the seed allowed instead of returning whatever was drawn first.
    const score = Math.min(worstGap, shortestLeg)
    if (score > nearestScore) {
      nearestScore = score
      nearest = puzzle
    }
  }
  return nearest ?? { capacities: [3, 5], targets: [4], budget: 6 + slack }
}

/**
 * The generator's own acceptance gate, read back off a finished board: it has to be solvable in the
 * budget it carries, and every leg has to have demanded the opening decision the family is about.
 */
export const gradeCanisters = (puzzle: CanistersPuzzle, options: CanistersOptions): Grade | null => {
  const { capacities, targets } = puzzle
  let at: Volumes = EMPTY
  let steps = 0
  let worstGap = Infinity
  for (const target of targets) {
    if (!isReachable(capacities, target)) return null
    const line = shortestLine(capacities, at, target)
    if (line === null || line.length === 0) return null
    worstGap = Math.min(worstGap, openingGap(capacities, at, target))
    steps += line.length
    at = playLine(capacities, at, line)
  }
  if (steps > puzzle.budget) return null
  return { steps, deepest: worstGap >= options.minGap ? "direction" : "pour" }
}
