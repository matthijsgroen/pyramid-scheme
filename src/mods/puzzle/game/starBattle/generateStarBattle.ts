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

// A tier that insists on a rung throws boards away. Generation is cheap here (a board is milliseconds, not
// the near-second eclipse's top tier costs), so the ceiling can sit well above what an unconstrained tier
// needs and the quota can afford to be strict.
const MAX_ATTEMPTS = 200

export const techniquesUpTo = (cap: StarBattleTechniqueId): StarBattleTechniqueId[] =>
  STAR_BATTLE_TECHNIQUES.filter(id => techniqueRank(id) <= techniqueRank(cap))

/**
 * A legal star set: one to a row, one to a column, no two touching. Drawn by backtracking down the rows.
 *
 * **The stars come first and the regions are drawn around them** (design doc §4), which is the whole
 * ordering of this generator: draw the regions first and the star set has to be found inside them, which is
 * a rejection loop that mostly fails. This way every region holds its star by construction.
 *
 * One star to a line is every tier this family ships (design doc §5). The RULES and the technique solver are
 * written for any quota — a group owes `puzzle.quota` and counts what it holds — and only this drawer is
 * not, because a two-star board is the open question §10.3 records rather than something a tier asks for.
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
 * Regions grown outwards from the stars until every square is claimed.
 *
 * Feeding the smallest region each step keeps them within a square or two of each other, which matters for
 * a reason that is not tidiness: a region that has swallowed half the grid is a clue that says nothing, and
 * the little ones left beside it say everything. Growing orthogonally makes contiguity free.
 */
const growRegions = (size: number, stars: readonly number[], random: () => number): number[] | undefined => {
  const regions: number[] = new Array(size * size).fill(-1)
  // As many regions as rows, each seeded with the one star it owes.
  stars.forEach((cell, index) => (regions[cell] = index))
  const sizes = new Array(size).fill(1)
  let left = size * size - stars.length
  while (left > 0) {
    const order = [...Array(size).keys()].sort((a, b) => sizes[a] - sizes[b] || random() - 0.5)
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
 * Build then thin: block every square that is not a star — the answer stated in full — then unblock squares
 * for as long as the technique solver still reaches the end unaided.
 *
 * Every intermediate board is settled by deduction, so the one that ships is too, and that settles
 * uniqueness at the same time: each step along the way was forced. No solution counter is needed, which is
 * the same gate every other family here passes through.
 *
 * Thinning is greedy over one random order, so it finds a local floor rather than the fewest blocked squares
 * that could possibly work (design doc §10.4). Eclipse measured a second sweep and it removed nothing.
 */
const thin = (
  puzzle: StarBattlePuzzle,
  solution: readonly boolean[],
  allowed: StarBattleTechniqueId[],
  random: () => number
): StarBattlePuzzle => {
  let blocked = [...puzzle.blocked]
  for (const cell of shuffle(
    blocked.flatMap((isBlocked, index) => (isBlocked ? [index] : [])),
    random
  )) {
    const candidate = blocked.map((was, index) => (index === cell ? false : was))
    if (!settles({ ...puzzle, blocked: candidate }, allowed, solution)) continue
    blocked = candidate
  }
  return { ...puzzle, blocked }
}

export const generateStarBattle = (seed: number, options: StarBattleOptions): StarBattlePuzzleWithAnswer => {
  const { size, techniqueCap, requires = [], requiresCount = 1 } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  let fallback: { board: StarBattlePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const stars = starSet(size, random)
    if (!stars) continue
    const regions = growRegions(size, stars, random)
    if (!regions) continue
    const solution = Array.from({ length: size * size }, (_unused, cell) => stars.includes(cell))
    const full = { size, quota: 1, regions, blocked: solution.map(star => !star) }
    if (!settles(full, allowed, solution)) continue
    const puzzle = thin(full, solution, allowed, random)
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

/** How much of the grid ships hatched — read off the generated board, for the playtesting bench. */
export const starBattleBlockedCount = (puzzle: StarBattlePuzzle) => puzzle.blocked.filter(Boolean).length
