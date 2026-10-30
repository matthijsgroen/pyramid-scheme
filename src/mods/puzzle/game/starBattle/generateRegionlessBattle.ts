import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import {
  demandedRungs,
  firstStarStep,
  meetsDemand,
  settles,
  starSet,
  techniquesUpTo,
  type StarBattlePuzzleWithAnswer,
} from "./generateStarBattle"
import type { StarBattlePuzzle } from "./starBattle"
import { REGIONLESS_TECHNIQUES, type StarBattleTechniqueId } from "./techniques"

export type RegionlessOptions = {
  size: number
  quota: number
  /** The most walls a board may carry, as a share of its squares. Walls are the gifts: fewer is harder. */
  maxWallShare: number
  techniqueCap: StarBattleTechniqueId
  /** Rungs the board must actually turn on; any one satisfies the gate (as star battle's `requires`). */
  requires?: StarBattleTechniqueId[]
  /** How many times a required rung has to fire. */
  requiresCount?: number
  /** The earliest step at which the first star may land. */
  firstStarAfter?: number
}

/** The share of squares walled before the first solve is worth paying for. */
const FIRST_SOLVE_SHARE = 0.25

/** How many star sets to draw before giving up; each is walled one square at a time until it settles. */
const MAX_ATTEMPTS = 2_000

// The gate itself, named once so the loop and `grade` cannot come to disagree.
const meetsShape = (
  steps: readonly { technique: StarBattleTechniqueId; decisions: readonly { mark: string }[] }[],
  { requires = [], requiresCount = 1, firstStarAfter = 0 }: RegionlessOptions
) => meetsDemand(steps, requires, requiresCount) && firstStarStep(steps) >= firstStarAfter

export const gradeRegionlessBattle = (board: StarBattlePuzzleWithAnswer, options: RegionlessOptions): Grade | null => {
  const result = settles(board, techniquesUpTo(options.techniqueCap, REGIONLESS_TECHNIQUES), board.solution)
  if (!result || !meetsShape(result.steps, options)) return null
  return { steps: result.steps.length, deepest: result.deepest }
}

/**
 * The stars first, then walls on random squares one at a time until the ladder settles the board, then
 * every wall the ladder can do without taken away again.
 *
 * **The thinning is what makes the wall count a knob at all.** Walls that arrive at random settle a board
 * at about three squares in five (measured at 7×7: 22 to 41 of 49); most of them are redundant, and
 * dropping each one that the ladder does not miss leaves about a third. A wall only ever adds to what the
 * ladder knows, so the walls left are the ones the board cannot do without. A board that then misses the
 * tier's shape is a miss: more walls only make it easier.
 */
export const generateRegionlessBattle = (
  seed: number,
  options: RegionlessOptions,
  attempts: number = MAX_ATTEMPTS
): StarBattlePuzzleWithAnswer => {
  const { size, quota, maxWallShare, techniqueCap, requires = [] } = options
  const allowed = techniquesUpTo(techniqueCap, REGIONLESS_TECHNIQUES)
  const random = mulberry32(seed)
  const mostWalls = Math.floor(maxWallShare * size * size)
  let fallback: { board: StarBattlePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < attempts; attempt++) {
    const stars = starSet(size, quota, random)
    if (!stars) continue
    const solution = Array.from({ length: size * size }, (_unused, cell) => stars.includes(cell))
    const order = shuffle(
      Array.from({ length: size * size }, (_unused, cell) => cell).filter(cell => !solution[cell]),
      random
    )
    const walls: boolean[] = new Array(size * size).fill(false)
    const settledWith = (): StarBattlePuzzle | undefined => {
      const puzzle: StarBattlePuzzle = { size, quota, walls: [...walls] }
      return settles(puzzle, allowed, solution) ? puzzle : undefined
    }
    // No board settles under a quarter of its squares walled (measured: 19 of 49 at best), so those first
    // walls go in without a solve each.
    order.slice(0, Math.floor(size * size * FIRST_SOLVE_SHARE)).forEach(cell => (walls[cell] = true))
    if (!order.some(cell => ((walls[cell] = true), settledWith()))) continue
    for (const cell of shuffle(
      order.filter(at => walls[at]),
      random
    )) {
      walls[cell] = false
      if (!settledWith()) walls[cell] = true
    }
    if (walls.filter(Boolean).length > mostWalls) continue
    const puzzle = settledWith()!
    const result = settles(puzzle, allowed, solution)!
    const board = { ...puzzle, solution, techniqueCap }
    if (meetsShape(result.steps, options)) return board
    const demanded = demandedRungs(result.steps, requires)
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`regionless battle: no board for size ${size} at ${techniqueCap}`)
  return fallback.board
}
