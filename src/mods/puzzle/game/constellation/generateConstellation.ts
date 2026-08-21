import { mulberry32, shuffle } from "@/game/random"
import {
  colOf,
  crossingsByPair,
  MAX_LINES,
  pairsOf,
  rowOf,
  type ConstellationPuzzle,
  type Pair,
  type Star,
} from "./constellation"
import {
  CONSTELLATION_TECHNIQUES,
  solveConstellationByTechniques,
  techniqueRank,
  type ConstellationTechniqueId,
} from "./techniques"

export type ConstellationPuzzleWithAnswer = ConstellationPuzzle & {
  /** Lines per pair index. */
  solution: readonly number[]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: ConstellationTechniqueId
}

export type ConstellationOptions = {
  size: number
  /** How many stars the sky is grown to, if the drawer can fit them. */
  stars: number
  /**
   * How often a line is drawn double, and how often a spare line is added between stars already placed.
   *
   * Together these are the **number mix** the family scales on (docs/game-design/puzzles/constellation.md
   * §5): both raise the numbers on the board, and a high number forces its own lines where a low one forces
   * nothing. Leaning them out is what makes a wizard sky harder than a master one of the same width.
   */
  doubleChance: number
  spareChance: number
  /** The strongest deduction a board may demand. */
  techniqueCap: ConstellationTechniqueId
  /**
   * Rungs the board must actually TURN ON. The solver only ever reaches for the cheapest technique that
   * fires, so a solve whose steps include one of these is a board that stalls without it. Any one satisfies
   * the gate.
   */
  requires?: ConstellationTechniqueId[]
  /**
   * How many times a required rung has to fire.
   *
   * One is not a tier: thirty forced counting steps with a single hard reading in the middle is the tier
   * below plus a moment of thought.
   */
  requiresCount?: number
}

// A tier that insists on a rung throws skies away, and there is no thinning pass to rescue one — a sky that
// does not solve is redrawn. So the ceiling sits well above the handful of draws an unconstrained tier needs.
const MAX_ATTEMPTS = 1200

export const techniquesUpTo = (cap: ConstellationTechniqueId): ConstellationTechniqueId[] =>
  CONSTELLATION_TECHNIQUES.filter(id => techniqueRank(id) <= techniqueRank(cap))

type Drawing = {
  /** Cells holding a star, in placement order. */
  cells: number[]
  /** Lines drawn, keyed `"cellA-cellB"` with the smaller cell first, valued 1 or 2. */
  lines: Map<string, number>
}

const lineKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`

const STEPS = [
  { row: 0, col: 1 },
  { row: 0, col: -1 },
  { row: 1, col: 0 },
  { row: -1, col: 0 },
]

/** The cells a line between two aligned cells passes through, endpoints excluded. */
const between = (size: number, a: number, b: number): number[] => {
  const step = rowOf(size, a) === rowOf(size, b) ? 1 : size
  const [from, to] = [Math.min(a, b), Math.max(a, b)]
  return Array.from({ length: (to - from) / step - 1 }, (_unused, index) => from + step * (index + 1))
}

const neighbourCells = (size: number, cell: number): number[] =>
  STEPS.flatMap(({ row, col }) => {
    const [nextRow, nextCol] = [rowOf(size, cell) + row, colOf(size, cell) + col]
    return nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size ? [] : [nextRow * size + nextCol]
  })

/** Cells a line already runs through, which nothing may cross and no star may sit on. */
const occupied = (size: number, drawing: Drawing): Set<number> =>
  new Set(
    [...drawing.lines.keys()].flatMap(key => {
      const [a, b] = key.split("-").map(Number)
      return between(size, a, b)
    })
  )

/**
 * Grow a sky from one star.
 *
 * Each step reaches out from a star already placed, two or more cells along a row or column, and drops a new
 * star with a line to it. The reach has to be at least two so the line is visible between them, the path has
 * to be clear of stars and of other lines, and the new star may not sit against one already placed —
 * touching stars are two hit areas that cannot be pressed apart (§8), and the line between them would have
 * no sky to be seen in.
 *
 * Connectivity is free: every star arrives attached to one already in the sky, so the drawing is one
 * constellation by construction and the rule never has to be checked.
 */
const growSky = (size: number, target: number, random: () => number, doubleChance: number): Drawing => {
  const drawing: Drawing = { cells: [Math.floor(random() * size * size)], lines: new Map() }
  // Every legal next star is enumerated rather than sampled-and-retried. On a board this constrained — no
  // two stars adjacent, no line crossing another — blind sampling misses far more often than it hits, and a
  // sky that stops short of its star count is a tier quietly shipping the tier below's board size.
  while (drawing.cells.length < target) {
    const taken = occupied(size, drawing)
    const options = drawing.cells.flatMap(from =>
      STEPS.flatMap(({ row, col }) =>
        Array.from({ length: size - 2 }, (_unused, index) => index + 2).flatMap(reach => {
          const [toRow, toCol] = [rowOf(size, from) + row * reach, colOf(size, from) + col * reach]
          if (toRow < 0 || toRow >= size || toCol < 0 || toCol >= size) return []
          const to = toRow * size + toCol
          if (drawing.cells.includes(to) || taken.has(to)) return []
          if (neighbourCells(size, to).some(near => drawing.cells.includes(near))) return []
          if (between(size, from, to).some(cell => taken.has(cell) || drawing.cells.includes(cell))) return []
          return [{ from, to }]
        })
      )
    )
    if (!options.length) break
    const { from, to } = options[Math.floor(random() * options.length)]
    drawing.cells.push(to)
    drawing.lines.set(lineKey(from, to), random() < doubleChance ? MAX_LINES : 1)
  }
  return drawing
}

/**
 * Extra lines between stars already placed, which is the other half of the number mix.
 *
 * Only pairs the rules allow: the nearest two stars along a line, nothing crossing, and never a second line
 * where one pair already carries two.
 */
const addSpares = (size: number, drawing: Drawing, random: () => number, spareChance: number): void => {
  const stars: Star[] = drawing.cells.map(cell => ({ cell, count: 0 }))
  for (const pair of shuffle(pairsOf(size, stars), random)) {
    if (random() >= spareChance) continue
    const [a, b] = [stars[pair.a].cell, stars[pair.b].cell]
    const key = lineKey(a, b)
    const held = drawing.lines.get(key) ?? 0
    if (held >= MAX_LINES) continue
    if (!held && between(size, a, b).some(cell => occupied(size, drawing).has(cell))) continue
    drawing.lines.set(key, held + 1)
  }
}

/** A drawn sky read as a board: the stars, their numbers, and every line the rules would allow. */
const boardOf = (size: number, drawing: Drawing): { puzzle: ConstellationPuzzle; solution: number[] } => {
  const cells = [...drawing.cells].sort((a, b) => a - b)
  const stars: Star[] = cells.map(cell => ({ cell, count: 0 }))
  const pairs: Pair[] = pairsOf(size, stars)
  const solution = pairs.map(pair => drawing.lines.get(lineKey(cells[pair.a], cells[pair.b])) ?? 0)
  pairs.forEach((pair, index) => {
    stars[pair.a].count += solution[index]
    stars[pair.b].count += solution[index]
  })
  return { puzzle: { size, stars, pairs }, solution }
}

/** A star with no lines is a star with nothing to deduce, and a crossing is a sky the drawer got wrong. */
const isWellFormed = (puzzle: ConstellationPuzzle, solution: readonly number[]): boolean => {
  const crossings = crossingsByPair(puzzle)
  return (
    puzzle.stars.every(star => star.count > 0) &&
    solution.every((count, pair) => !count || !crossings[pair].some(other => solution[other] > 0))
  )
}

/**
 * Draw then test, and there is no third step.
 *
 * Eclipse and futoshiki thin: they write down every clue the answer implies and take clues away while the
 * board still solves. Here every star always shows its number and the numbers are exactly what the lines
 * drawn add up to, so there is nothing to thin and no way to loosen a sky that fails — it is redrawn. What
 * pays that bill down is the drawer being biased toward the shape the tier wants (`doubleChance`,
 * `spareChance`) rather than uniform.
 *
 * Uniqueness comes from the same gate that accepts the board: every step of the solve was forced, so the
 * sky that ships has exactly one answer and no solution counter has to run.
 */
export const generateConstellation = (seed: number, options: ConstellationOptions): ConstellationPuzzleWithAnswer => {
  const { size, stars, doubleChance, spareChance, techniqueCap, requires = [], requiresCount = 1 } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  let fallback: { board: ConstellationPuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const drawing = growSky(size, stars, random, doubleChance)
    // A sky that ran out of room before its star count is thrown away rather than shipped: the count is what
    // the tier authored, and a draw that grew itself into a dead end is the cheapest thing here to redo.
    if (drawing.cells.length < stars) continue
    addSpares(size, drawing, random, spareChance)
    const { puzzle, solution } = boardOf(size, drawing)
    if (!isWellFormed(puzzle, solution)) continue
    const result = solveConstellationByTechniques(puzzle, allowed)
    if (!result.settled || result.lines.some((count, pair) => count !== solution[pair])) continue
    const board = { ...puzzle, solution, techniqueCap }
    // A sky that never needed the tier's own rung teaches the tier below it, so it is only kept if nothing
    // better turns up.
    const demanded = result.steps.filter(step => requires.includes(step.technique)).length
    if (!requires.length || demanded >= requiresCount) return board
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`constellation: no board for ${stars} stars on ${size} at ${techniqueCap}`)
  return fallback.board
}
