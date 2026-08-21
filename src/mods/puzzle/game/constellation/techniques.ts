import { crossingsByPair, MAX_LINES, pairsByStar, type ConstellationPuzzle } from "./constellation"

// The deduction system behind both generation and hints, per docs/game-design/puzzles/constellation.md §3.
// Ordered by how well each reason EXPLAINS itself rather than by how much it decides: "only one way left, so
// both lines go there" is a sentence the player can repeat back, and "that line would seal these six off from
// the rest" is last because it is the one reason they have to trace a group to check.
export const CONSTELLATION_TECHNIQUES = [
  "capacity",
  "settled",
  "soleWayOut",
  "crossed",
  "atLeastOne",
  // Before isolation on purpose: it is the same reason read in one clause, about two stars the player is
  // already looking at, where the general rung is about a group they have to follow.
  "twinBlock",
  "isolation",
] as const

export type ConstellationTechniqueId = (typeof CONSTELLATION_TECHNIQUES)[number]

/**
 * The order a **hint** reaches for a reason: whichever is quickest to see, not whichever is weakest.
 *
 * Two jobs, two orders. `CONSTELLATION_TECHNIQUES` above is the strength ladder, and a tier's cap is a
 * prefix of it — that is what decides which reasoning a board may be built to need. This list decides which
 * of the reasons that DO apply gets said out loud: a star that already has its lines, then a star with one
 * way out, then a crossing, then the counting arguments, and the sealing ones last.
 *
 * Every rung appears exactly once in both, which `techniques.spec.ts` checks.
 */
export const CONSTELLATION_HINT_ORDER: readonly ConstellationTechniqueId[] = [
  "settled",
  "soleWayOut",
  "crossed",
  "capacity",
  "atLeastOne",
  "twinBlock",
  "isolation",
]

export const techniqueRank = (id: ConstellationTechniqueId): number => CONSTELLATION_TECHNIQUES.indexOf(id)

/**
 * How many lines a pair may still hold, and how many it must.
 *
 * The player draws lines and nothing else, but reasoning about a star needs both halves: half the ladder
 * decides that a way out is **closed** rather than that a line is drawn. So the solver works in bounds and
 * a pair is decided when they meet — and a rung that lowers a `max` becomes a hint that says "stop
 * considering that way", which is a move the player can make.
 */
export type Bound = { min: number; max: number }

export type ConstellationDecision = { pair: number; min?: number; max?: number }

export type ConstellationStep = {
  technique: ConstellationTechniqueId
  /** Which reading of the technique fired — each is a different sentence to the player. */
  variant?: string
  /** The star the reason counts from, when it counts from one. */
  star?: number
  /** The number the sentence says out loud. */
  count?: number
  /** The pairs the reason talks about, the decided one first. */
  pairs: number[]
  /** The stars the reason points at — a sealing reason points at the group it would close. */
  stars: number[]
  decisions: ConstellationDecision[]
}

/**
 * Bounds a board opens with: nothing drawn, and a pair capped by the smaller of its two stars.
 *
 * The cap is reading the number rather than deducing anything — a 1 cannot take two lines, and no sentence
 * about that is worth a rung.
 */
export const initialBounds = (puzzle: ConstellationPuzzle): Bound[] =>
  puzzle.pairs.map(pair => ({
    min: 0,
    max: Math.min(MAX_LINES, puzzle.stars[pair.a].count, puzzle.stars[pair.b].count),
  }))

const sumBy = <T>(items: readonly T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0)

type Reading = { puzzle: ConstellationPuzzle; bounds: readonly Bound[]; byStar: number[][] }

/** Lines a star still owes: its number, less what is already forced onto its pairs. */
const owed = ({ puzzle, bounds, byStar }: Reading, star: number) =>
  puzzle.stars[star].count - sumBy(byStar[star], pair => bounds[pair].min)

/** Lines a star could still take, if every open way out took all it could. */
const room = ({ bounds, byStar }: Reading, star: number) =>
  sumBy(byStar[star], pair => bounds[pair].max - bounds[pair].min)

const openPairs = ({ bounds, byStar }: Reading, star: number) =>
  byStar[star].filter(pair => bounds[pair].max > bounds[pair].min)

/** A star whose number needs every line its open ways out can carry, so all of them fill. */
const capacitySteps = (reading: Reading): ConstellationStep[] =>
  reading.puzzle.stars.flatMap((star, index) => {
    const open = openPairs(reading, index)
    if (open.length < 2 || owed(reading, index) <= 0 || owed(reading, index) !== room(reading, index)) return []
    return [
      {
        technique: "capacity" as const,
        star: index,
        count: star.count,
        pairs: open,
        stars: [index],
        decisions: open.map(pair => ({ pair, min: reading.bounds[pair].max })),
      },
    ]
  })

/** A star that already has its lines: every other way out is closed. */
const settledSteps = (reading: Reading): ConstellationStep[] =>
  reading.puzzle.stars.flatMap((star, index) => {
    const open = openPairs(reading, index)
    if (owed(reading, index) !== 0 || !open.length) return []
    return [
      {
        technique: "settled" as const,
        star: index,
        count: star.count,
        pairs: open,
        stars: [index],
        decisions: open.map(pair => ({ pair, max: reading.bounds[pair].min })),
      },
    ]
  })

/** One way out left and lines still owed: all of them go there. */
const soleWayOutSteps = (reading: Reading): ConstellationStep[] =>
  reading.puzzle.stars.flatMap((_unused, index) => {
    const open = openPairs(reading, index)
    const owing = owed(reading, index)
    if (open.length !== 1 || owing <= 0) return []
    const [pair] = open
    const min = reading.bounds[pair].min + owing
    if (min > reading.bounds[pair].max) return []
    return [
      {
        technique: "soleWayOut" as const,
        star: index,
        count: owing,
        pairs: [pair],
        stars: [index],
        decisions: [{ pair, min }],
      },
    ]
  })

/**
 * A line already drawn closes every line that would have to cross it.
 *
 * The one rung that does no counting, and the reason a long line matters: drawn across the middle of the
 * sky, it quietly takes a way out away from every star it passes.
 */
const crossedSteps = (reading: Reading): ConstellationStep[] => {
  const crossings = crossingsByPair(reading.puzzle)
  return reading.puzzle.pairs.flatMap((_unused, pair) => {
    if (reading.bounds[pair].min === 0) return []
    const blocked = crossings[pair].filter(other => reading.bounds[other].max > 0)
    if (!blocked.length) return []
    return [
      {
        technique: "crossed" as const,
        pairs: [...blocked, pair],
        stars: [],
        decisions: blocked.map(other => ({ pair: other, max: 0 })),
      },
    ]
  })
}

/**
 * The pigeonhole: what the other ways out cannot carry between them has to come this way.
 *
 * A 3 with three ways out sends at least one down each, because two of them carry at most 4 and the third
 * would then carry none. It decides a single line rather than a whole star, which makes it the rung that
 * opens a board no amount of counting can start.
 */
const atLeastOneSteps = (reading: Reading): ConstellationStep[] =>
  reading.puzzle.stars.flatMap((star, index) => {
    const pairs = reading.byStar[index]
    if (pairs.length < 2) return []
    return pairs.flatMap(pair => {
      const elsewhere = sumBy(
        pairs.filter(other => other !== pair),
        other => reading.bounds[other].max
      )
      const min = star.count - elsewhere
      if (min <= reading.bounds[pair].min || min > reading.bounds[pair].max) return []
      return [
        {
          technique: "atLeastOne" as const,
          star: index,
          count: star.count,
          pairs: [pair, ...pairs.filter(other => other !== pair)],
          stars: [index],
          decisions: [{ pair, min }],
        },
      ]
    })
  })

/**
 * Two stars that joining would finish, with sky left over: a constellation of two.
 *
 * A pair of 1s cannot be joined at all, and a pair of 2s cannot be doubled. Both are `isolation` read in one
 * clause about two stars in front of the player, which is why they fire before it.
 */
const twinBlockSteps = (reading: Reading): ConstellationStep[] => {
  if (reading.puzzle.stars.length <= 2) return []
  return reading.puzzle.pairs.flatMap((pair, index) => {
    const [a, b] = [reading.puzzle.stars[pair.a], reading.puzzle.stars[pair.b]]
    if (a.count !== b.count || a.count > MAX_LINES) return []
    const bound = reading.bounds[index]
    // The pair would carry the whole of both stars' numbers, which leaves them joined to nothing else.
    if (bound.max < a.count) return []
    return [
      {
        technique: "twinBlock" as const,
        variant: a.count === 1 ? "single" : "double",
        count: a.count,
        pairs: [index],
        stars: [pair.a, pair.b],
        decisions: [{ pair: index, max: a.count - 1 }],
      },
    ]
  })
}

/** The stars reachable from a start along pairs already forced, under the given bounds. */
const forcedGroup = (reading: Reading, start: number): Set<number> => {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const star = queue.shift()!
    for (const pair of reading.byStar[star]) {
      if (reading.bounds[pair].min === 0) continue
      const { a, b } = reading.puzzle.pairs[pair]
      for (const next of [a, b])
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
    }
  }
  return seen
}

/**
 * A line that would close a group short of the whole sky is a line that cannot be drawn.
 *
 * The family's one global rung, and it is global about a **finished** thing, which is what makes it fair:
 * add the line, and if every star it joins up then has all its lines while stars remain outside, the group
 * can never reach them. That is a countable question with a visible answer, where "this might strand
 * something eventually" would not be.
 */
const isolationSteps = (reading: Reading): ConstellationStep[] =>
  reading.puzzle.pairs.flatMap((pair, index) => {
    const bound = reading.bounds[index]
    if (bound.max <= bound.min) return []
    const bumped = reading.bounds.map((each, at) => (at === index ? { ...each, min: each.min + 1 } : each))
    const after = { ...reading, bounds: bumped }
    const group = forcedGroup(after, pair.a)
    if (group.size === reading.puzzle.stars.length) return []
    if ([...group].some(star => owed(after, star) !== 0)) return []
    return [
      {
        technique: "isolation" as const,
        count: group.size,
        pairs: [index],
        stars: [...group],
        decisions: [{ pair: index, max: bound.min }],
      },
    ]
  })

const IMPLEMENTATIONS: Record<ConstellationTechniqueId, (reading: Reading) => ConstellationStep[]> = {
  capacity: capacitySteps,
  settled: settledSteps,
  soleWayOut: soleWayOutSteps,
  crossed: crossedSteps,
  atLeastOne: atLeastOneSteps,
  twinBlock: twinBlockSteps,
  isolation: isolationSteps,
}

/** A decision that actually tightens the bound it names — the rest are a rung repeating itself. */
const tightens = (bounds: readonly Bound[], decision: ConstellationDecision): boolean =>
  (decision.min !== undefined && decision.min > bounds[decision.pair].min) ||
  (decision.max !== undefined && decision.max < bounds[decision.pair].max)

/**
 * The cheapest technique that decides something, or undefined when nothing is forced.
 *
 * `allowed` is the board's own tier, so a starter board never explains itself with reasoning it was never
 * built to need. It stays in ladder order: taking the first technique that fires is what keeps a hint cheap.
 */
export const nextConstellationStep = (
  puzzle: ConstellationPuzzle,
  bounds: readonly Bound[],
  allowed: readonly ConstellationTechniqueId[] = CONSTELLATION_TECHNIQUES
): ConstellationStep | undefined => {
  const reading: Reading = { puzzle, bounds, byStar: pairsByStar(puzzle) }
  for (const technique of allowed) {
    const step = IMPLEMENTATIONS[technique](reading).find(candidate =>
      candidate.decisions.some(decision => tightens(bounds, decision))
    )
    if (step) return { ...step, decisions: step.decisions.filter(decision => tightens(bounds, decision)) }
  }
  return undefined
}

const MAX_PASSES = 2000

/** Carries a board as far as the `allowed` techniques take it, writing into `bounds`. */
export const applyConstellationTechniques = (
  puzzle: ConstellationPuzzle,
  bounds: Bound[],
  allowed: readonly ConstellationTechniqueId[] = CONSTELLATION_TECHNIQUES
): ConstellationStep[] => {
  const steps: ConstellationStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const step = nextConstellationStep(puzzle, bounds, allowed)
    if (!step) break
    for (const decision of step.decisions) {
      if (decision.min !== undefined) bounds[decision.pair].min = decision.min
      if (decision.max !== undefined) bounds[decision.pair].max = decision.max
    }
    steps.push(step)
  }
  return steps
}

export type ConstellationSolveResult = {
  bounds: Bound[]
  /** The lines the solve settled on, where it settled them. */
  lines: number[]
  /** Every pair reached by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: ConstellationStep[]
  /** The strongest technique the board actually demanded. */
  deepest?: ConstellationTechniqueId
}

export const solveConstellationByTechniques = (
  puzzle: ConstellationPuzzle,
  allowed: readonly ConstellationTechniqueId[] = CONSTELLATION_TECHNIQUES
): ConstellationSolveResult => {
  const bounds = initialBounds(puzzle)
  const steps = applyConstellationTechniques(puzzle, bounds, allowed)
  return {
    bounds,
    lines: bounds.map(bound => bound.min),
    settled: bounds.every(bound => bound.min === bound.max),
    steps,
    deepest: steps.reduce<ConstellationTechniqueId | undefined>(
      (deepest, step) =>
        !deepest || techniqueRank(step.technique) > techniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}

/**
 * Bounds that describe the board as the player has drawn it, for hints.
 *
 * Lines drawn are a floor rather than an answer — a player part-way through has drawn some of the lines a
 * star owes, and the rungs reason from what is there. So `min` is what they drew and `max` stays open, which
 * is the same reading generation starts from with nothing drawn at all.
 */
export const boundsFromLines = (puzzle: ConstellationPuzzle, lines: readonly number[]): Bound[] =>
  initialBounds(puzzle).map((bound, pair) => ({ ...bound, min: Math.max(bound.min, lines[pair]) }))
