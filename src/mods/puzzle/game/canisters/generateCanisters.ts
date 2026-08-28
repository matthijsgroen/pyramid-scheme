import { mulberry32 } from "@/game/random"
import type { Grade } from "@/game/families/familyMeta"
import {
  forkCount,
  playLine,
  shortestLine,
  totalOf,
  type Capacities,
  type CanistersPuzzle,
  type Volumes,
} from "./canisters"

export type CanistersOptions = {
  /** How many volumes are asked for in turn. */
  legs: number
  /** How many canisters stand on the bench. Three at least — two can only be poured back and forth. */
  canisters: number
  /** The full canister's size, which is also all the water there is. */
  maxCapacity: number
  /** The shortest a leg's own line may be, and the difficulty dial (§3). */
  minLine: number
  /** How many of a leg's pours must fork, so a board is decided rather than walked. */
  minForks: number
  /** Slack on top of the optimal line, in moves. Starter is forgiving; everything above is exact. */
  slack?: number
}

const MAX_ATTEMPTS = 600

/**
 * Sets of canisters worth pouring between: the big one full, and the rest able to take it between them.
 *
 * **The others must hold the big one between them** or the water has nowhere to go and the board is over
 * in a pour. That single condition is what makes a set playable.
 */
const setsFor = (canisters: number, maxCapacity: number): Capacities[] => {
  const out: Capacities[] = []
  const build = (rest: number, below: number, chosen: number[]) => {
    if (rest === 0) {
      const big = chosen[0]
      const others = chosen.slice(1).reduce((sum, each) => sum + each, 0)
      if (others >= big) out.push([...chosen])
      return
    }
    for (let size = below - 1; size >= 2; size--) build(rest - 1, size, [...chosen, size])
  }
  for (let big = 6; big <= maxCapacity; big++) build(canisters - 1, big, [big])
  return out
}

/**
 * Draw-and-measure (§3). A board is a set of canisters, the big one full, a run of targets and a budget.
 * Nothing is carved and nothing hidden, so generation can only fail on being too easy.
 */
export const generateCanisters = (seed: number, options: CanistersOptions): CanistersPuzzle => {
  const random = mulberry32(seed)
  const { legs, canisters, maxCapacity, minLine, minForks, slack = 0 } = options
  const sets = setsFor(canisters, maxCapacity)

  let nearest: CanistersPuzzle | undefined
  let nearestScore = -Infinity

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const capacities = sets[Math.floor(random() * sets.length)]
    const start: Volumes = capacities.map((each, index) => (index === 0 ? each : 0))
    const total = totalOf(start)

    const targets: number[] = []
    let at = start
    let budget = 0
    let shortestLeg = Infinity
    let forks = Infinity

    for (let leg = 0; leg < legs; leg++) {
      // Only amounts the water could actually stand at: never more than the total, never more than a
      // canister holds, and not one that is already standing there.
      const wanted = Array.from({ length: Math.min(total, Math.max(...capacities)) }, (_u, i) => i + 1).filter(
        volume => !at.includes(volume)
      )
      if (wanted.length === 0) break
      const target = wanted[Math.floor(random() * wanted.length)]
      const line = shortestLine(capacities, at, target)
      if (line === null || line.length === 0) break
      shortestLeg = Math.min(shortestLeg, line.length)
      forks = Math.min(forks, forkCount(capacities, at, line))
      targets.push(target)
      budget += line.length
      at = playLine(capacities, at, line)
    }

    if (targets.length < legs) continue
    const puzzle: CanistersPuzzle = { capacities, start, targets, budget: budget + slack }
    if (shortestLeg >= minLine && forks >= minForks) return puzzle
    const score = Math.min(shortestLeg, forks * 2)
    if (score > nearestScore) {
      nearestScore = score
      nearest = puzzle
    }
  }
  return nearest ?? { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 7 + slack }
}

/** The generator's own acceptance gate, read back off a finished board. */
export const gradeCanisters = (puzzle: CanistersPuzzle, options: CanistersOptions): Grade | null => {
  const { capacities, start, targets } = puzzle
  let at: Volumes = start
  let steps = 0
  let forks = Infinity
  for (const target of targets) {
    const line = shortestLine(capacities, at, target)
    if (line === null || line.length === 0) return null
    forks = Math.min(forks, forkCount(capacities, at, line))
    steps += line.length
    at = playLine(capacities, at, line)
  }
  if (steps > puzzle.budget) return null
  return { steps, deepest: forks >= options.minForks ? "fork" : "pour" }
}
