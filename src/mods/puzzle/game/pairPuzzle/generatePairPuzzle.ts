import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import { colOf, neighboursOf, rowOf } from "../starBattle/starBattle"
import { type PairPuzzle } from "./pairPuzzle"
import { pairTechniquesUpTo, solvePairByTechniques, type PairStep, type PairTechniqueId } from "./techniques"

export type PairOptions = {
  size: number
  /** Pieces as a share of the squares. */
  density: number
  techniqueCap: PairTechniqueId
  /** Rungs the board must actually turn on; any one satisfies the gate. */
  requires?: PairTechniqueId[]
  /** How many times a required rung has to fire. */
  requiresCount?: number
  /** The earliest step at which the first piece may land. */
  firstPieceAfter?: number
}

export type PairPuzzleWithAnswer = PairPuzzle & {
  /** Which squares hold a piece. */
  solution: readonly boolean[]
  techniqueCap: PairTechniqueId
}

/** How many layouts to draw before settling for the nearest miss. */
const MAX_ATTEMPTS = 2_000

/** How many times the tier's own rungs fired. A board is kept on this, and a near miss ranked by it. */
const demandedRungs = (steps: readonly PairStep[], requires: readonly PairTechniqueId[]) =>
  steps.filter(step => requires.includes(step.technique)).length

/** How long the board makes the player eliminate before the first piece lands. */
export const firstPieceStep = (steps: readonly PairStep[]) =>
  steps.findIndex(step => step.decisions.some(decision => decision.mark === "piece"))

// The gate itself, named once so the loop and `grade` cannot come to disagree about it.
const meetsShape = (
  steps: readonly PairStep[],
  { requires = [], requiresCount = 1, firstPieceAfter = 0 }: PairOptions
) => (!requires.length || demandedRungs(steps, requires) >= requiresCount) && firstPieceStep(steps) >= firstPieceAfter

const settles = (puzzle: PairPuzzle, allowed: PairTechniqueId[], solution: readonly boolean[]) => {
  const result = solvePairByTechniques(puzzle, allowed)
  return result.settled && result.marks.every((mark, cell) => (mark === "piece") === solution[cell])
    ? result
    : undefined
}

const orthogonal = (size: number, cell: number) =>
  neighboursOf(size, cell).filter(at => rowOf(size, at) === rowOf(size, cell) || colOf(size, at) === colOf(size, cell))

/** Pieces that touch no other piece, each with its own orthogonal anchor on a square that is not a piece. */
const layout = (size: number, count: number, random: () => number) => {
  const pieces: number[] = []
  const blocked = new Set<number>()
  for (const cell of shuffle(
    Array.from({ length: size * size }, (_unused, at) => at),
    random
  )) {
    if (pieces.length === count) break
    if (blocked.has(cell)) continue
    pieces.push(cell)
    blocked.add(cell)
    neighboursOf(size, cell).forEach(at => blocked.add(at))
  }
  if (pieces.length < count) return undefined
  const anchors = new Set<number>()
  for (const piece of pieces) {
    const free = orthogonal(size, piece).filter(at => !pieces.includes(at) && !anchors.has(at))
    if (!free.length) return undefined
    anchors.add(free[Math.floor(random() * free.length)])
  }
  return { pieces, anchors }
}

const boardOf = (size: number, pieces: number[], anchors: Set<number>) => {
  const solution = Array.from({ length: size * size }, (_unused, cell) => pieces.includes(cell))
  const held = (cells: number[]) => cells.filter(cell => solution[cell]).length
  const line = (index: number, byRow: boolean) =>
    Array.from({ length: size }, (_unused, at) => (byRow ? index * size + at : at * size + index))
  return {
    size,
    anchors: Array.from({ length: size * size }, (_unused, cell) => anchors.has(cell)),
    rowCounts: Array.from({ length: size }, (_unused, row) => held(line(row, true))),
    colCounts: Array.from({ length: size }, (_unused, col) => held(line(col, false))),
    solution,
  }
}

export const gradePairPuzzle = (board: PairPuzzleWithAnswer, options: PairOptions): Grade | null => {
  const result = settles(board, pairTechniquesUpTo(options.techniqueCap), board.solution)
  if (!result || !meetsShape(result.steps, options)) return null
  return { steps: result.steps.length, deepest: result.deepest! }
}

/**
 * A random piece layout with an anchor beside each piece, counts read off it, kept when the tier's ladder
 * settles the board from blank and the board meets the tier's shape; the nearest miss otherwise.
 *
 * Uniqueness is the forward solve itself: every step was forced, so the answer is the only one and no
 * solution counter runs. A board's whole clue is its anchors, so a draw that fails is redrawn, not repaired.
 */
export const generatePairPuzzle = (
  seed: number,
  options: PairOptions,
  attempts: number = MAX_ATTEMPTS
): PairPuzzleWithAnswer => {
  const { size, density, techniqueCap, requires = [] } = options
  const allowed = pairTechniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  const count = Math.round(density * size * size)
  let fallback: { board: PairPuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < attempts; attempt++) {
    const drawn = layout(size, count, random)
    if (!drawn) continue
    const board = { ...boardOf(size, drawn.pieces, drawn.anchors), techniqueCap }
    const result = settles(board, allowed, board.solution)
    if (!result) continue
    if (meetsShape(result.steps, options)) return board
    const demanded = demandedRungs(result.steps, requires)
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`pair puzzle: no board for size ${size} at ${techniqueCap}`)
  return fallback.board
}
