import { mulberry32, shuffle } from "@/game/random"
import { cellAt, colOf, neighboursOf, rowOf, type StarBattlePuzzle } from "./starBattle"
import {
  solveStarBattleByTechniques,
  STAR_BATTLE_TECHNIQUES,
  techniqueRank,
  type StarBattleTechniqueId,
} from "./techniques"

export type StarBattlePuzzleWithAnswer = StarBattlePuzzle & {
  /** Where the stars go, as a mask over the grid. */
  solution: readonly boolean[]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: StarBattleTechniqueId
}

export type StarBattleOptions = {
  size: number
  /**
   * How unevenly the regions are sized, as the exponent their target sizes follow — and **this is the
   * family's real difficulty knob**, not the technique cap (design doc §5).
   *
   * Sizes go as `(n + 1) ** spread`, so 1 is a gentle ramp, 2 a square spread, 3 a steep one. Pushing it up
   * makes boards EASIER and cheaper to find, because a one-square region is a star handed over: at 3 on an
   * 8×8, six draws in a hundred are solvable and the region rungs never fire. Pulling it down to 2 leaves one
   * draw in a hundred, and those boards spend two or three region readings each. Below about 2 the boards stop
   * existing — at an even spread every region sprawls across the whole grid, nothing is ever confined to a
   * line, and the reasoning has nowhere to start.
   */
  regionSpread: number
  /** The strongest deduction a board may demand. */
  techniqueCap: StarBattleTechniqueId
  /**
   * Rungs the board must actually TURN ON. The solver only ever reaches for the cheapest technique that
   * fires, so a solve whose steps include one of these is a board that stalls without it. Any one satisfies
   * the gate.
   */
  requires?: StarBattleTechniqueId[]
  /** How many times a required rung has to fire. One is not a tier. */
  requiresCount?: number
}

/**
 * How many region maps to draw before giving up.
 *
 * Generation is a rejection loop — **a board carries no clue but its region map, so the map is what has to
 * be right** (design doc §4). Most maps are not: about half work at 5×5 and under one in a hundred at 8×8,
 * and a tier's required rung throws away more of what is left. A draw is a fraction of a millisecond, so the
 * ceiling is set by what the top tier needs rather than by what a cheap tier would like.
 */
const MAX_ATTEMPTS = 20_000

export const techniquesUpTo = (cap: StarBattleTechniqueId): StarBattleTechniqueId[] =>
  STAR_BATTLE_TECHNIQUES.filter(id => techniqueRank(id) <= techniqueRank(cap))

/**
 * A legal star set: one to a row, one to a column, no two touching. Drawn by backtracking down the rows.
 *
 * **The stars come first and the regions are drawn around them** (design doc §4), which is the whole ordering
 * of this generator: draw the regions first and the star set has to be found inside them, which is a rejection
 * loop on top of a rejection loop. This way every region holds its star by construction.
 *
 * One star to a line is every tier this family ships (design doc §5). The RULES and the technique solver are
 * written for any quota — a group owes `puzzle.quota` and counts what it holds — and only this drawer is not,
 * because a two-star board is the open question §10 records rather than something a tier asks for.
 */
const starSet = (size: number, random: () => number): number[] | undefined => {
  const placed: number[] = []
  const fill = (row: number): boolean => {
    if (row === size) return true
    for (const col of shuffle(
      Array.from({ length: size }, (_unused, index) => index),
      random
    )) {
      const cell = cellAt(size, row, col)
      if (placed.some(at => colOf(size, at) === col)) continue
      if (neighboursOf(size, cell).some(at => placed.includes(at))) continue
      placed.push(cell)
      if (fill(row + 1)) return true
      placed.pop()
    }
    return false
  }
  return fill(0) ? placed : undefined
}

/**
 * How big each region is grown to be — and **this distribution is the difference between a family that works
 * and one that does not.**
 *
 * Grown to equal sizes a region map says almost nothing: every region sprawls across most of the board, so no
 * region is ever confined to a line and the reasoning has nowhere to start. Measured, not guessed — with even
 * targets, **not one map in six thousand** could be solved at any size, which is what sent an earlier draft of
 * this family looking for a second clue layer to lean on. Spread the sizes instead and the same search finds
 * solvable maps easily. It is also what hand-made grids look like: a one-square region beside a
 * fourteen-square one, and the little ones are where a solve begins.
 */
const regionTargets = (size: number, spread: number): number[] => {
  const shape = Array.from({ length: size }, (_unused, index) => (index + 1) ** spread)
  const scale = (size * size) / shape.reduce((total, part) => total + part, 0)
  return shape.map(part => Math.max(1, part * scale))
}

/**
 * Regions grown outwards from the stars until every square is claimed.
 *
 * Each step feeds whichever region is furthest behind its target, so the sizes come out in the intended
 * spread. Growing orthogonally makes contiguity free.
 */
const growRegions = (
  size: number,
  stars: readonly number[],
  random: () => number,
  spread: number
): number[] | undefined => {
  const targets = regionTargets(size, spread)
  const regions: number[] = new Array(size * size).fill(-1)
  // As many regions as rows, each seeded with the one star it owes.
  stars.forEach((cell, index) => (regions[cell] = index))
  const sizes = new Array(size).fill(1)
  let left = size * size - stars.length
  while (left > 0) {
    const order = [...Array(size).keys()].sort(
      (a, b) => sizes[a] / targets[a] - sizes[b] / targets[b] || random() - 0.5
    )
    const grown = order.some(region => {
      const frontier = regions.flatMap((at, cell) => {
        if (at !== region) return []
        const [row, col] = [rowOf(size, cell), colOf(size, cell)]
        return [
          [row + 1, col],
          [row - 1, col],
          [row, col + 1],
          [row, col - 1],
        ].flatMap(([atRow, atCol]) => {
          if (atRow < 0 || atRow >= size || atCol < 0 || atCol >= size) return []
          const at = cellAt(size, atRow, atCol)
          return regions[at] === -1 ? [at] : []
        })
      })
      if (!frontier.length) return false
      regions[frontier[Math.floor(random() * frontier.length)]] = region
      sizes[region]++
      left--
      return true
    })
    // Every region walled in by its neighbours while squares are still unclaimed: this draw is a dead end.
    if (!grown) return undefined
  }
  return regions
}

const settles = (puzzle: StarBattlePuzzle, allowed: StarBattleTechniqueId[], solution: readonly boolean[]) => {
  const result = solveStarBattleByTechniques(puzzle, allowed)
  return result.settled && result.marks.every((mark, cell) => (mark === "star") === solution[cell]) ? result : undefined
}

/**
 * Draw a map, test it, keep it if the ladder settles it unaided.
 *
 * **Nothing is thinned, because there is nothing to thin**: the board's only clue is where the region
 * boundaries run, and a boundary cannot be taken away without redrawing the region. So a miss is a redraw,
 * the shape constellation's generation has (§4.21) — and the technique solver reaching the answer forwards is
 * what settles uniqueness at the same time, since every step along the way was forced. No solution counter
 * runs anywhere in this family.
 */
export const generateStarBattle = (seed: number, options: StarBattleOptions): StarBattlePuzzleWithAnswer => {
  const { size, regionSpread, techniqueCap, requires = [], requiresCount = 1 } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  let fallback: { board: StarBattlePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const stars = starSet(size, random)
    if (!stars) continue
    const regions = growRegions(size, stars, random, regionSpread)
    if (!regions) continue
    const solution = Array.from({ length: size * size }, (_unused, cell) => stars.includes(cell))
    const puzzle = { size, quota: 1, regions }
    const result = settles(puzzle, allowed, solution)
    if (!result) continue
    const board = { ...puzzle, solution, techniqueCap }
    // A board that never needed the tier's own rung teaches the tier below it, so it is only kept if
    // nothing better turns up.
    const demanded = result.steps.filter(step => requires.includes(step.technique)).length
    if (!requires.length || demanded >= requiresCount) return board
    // The nearest miss is the fallback, so a tier that cannot hit its quota still ships its hardest draw.
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`star battle: no board for size ${size} at ${techniqueCap}`)
  return fallback.board
}
