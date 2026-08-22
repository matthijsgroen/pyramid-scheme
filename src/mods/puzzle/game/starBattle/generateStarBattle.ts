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
   * Stars owed by every row, every column and every region.
   *
   * **Two is a different puzzle wearing the same rules, not a harder setting of this one.** At one star a
   * group is answered the moment it is found; at two, every group is a capacity argument until its last
   * star lands, which is what makes `groupTight` and the region readings count rather than merely fire.
   * The region count does NOT follow the quota — there are `size` regions either way, so a two-star region
   * is the same size as a one-star region and says twice as much. Halving the region count instead (one
   * star to a line, two to a region) doubles every region and the map stops being a clue at all; measured
   * at 0 of 4000 boards settling, and recorded in design doc §10.
   */
  quota: number
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
  /**
   * The fewest squares a region may be grown to, and **at two stars this is a difficulty knob rather than a
   * bound.**
   *
   * The arithmetic floor is `quota * 2 - 1`: two stars that may not touch need three squares to stand in.
   * But a region of exactly three can only be a straight line — an L cannot hold two stars that do not touch,
   * so a three-square region never survives generation as anything else — and a straight three owing two
   * stars has ONE filling. Every one of them is a square handed over before the player thinks.
   *
   * So the floor sets how much of the board is a gift: at 3 an 8×8 opens with about four of its eight regions
   * already answered. Raise it and the gifts go away; a four-in-a-line owing two stars has three fillings and
   * is a question. Unset takes the arithmetic floor, which is what a tier wanting an easy opening asks for.
   */
  minRegion?: number
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
 * A legal star set: `quota` to a row, `quota` to a column, no two touching. Drawn by backtracking down the
 * rows, choosing the row's stars together so a pair that touches is rejected where it is made.
 *
 * **The stars come first and the regions are drawn around them** (design doc §4), which is the whole ordering
 * of this generator: draw the regions first and the star set has to be found inside them, which is a rejection
 * loop on top of a rejection loop. This way every region holds its stars by construction.
 *
 * Columns are walked in a shuffled order and picked in increasing position within it, so a row's stars are
 * drawn as a random COMBINATION rather than a random sequence — the same pair reached two ways is one draw,
 * not two.
 */
const starSet = (size: number, quota: number, random: () => number): number[] | undefined => {
  const placed: number[] = []
  const inColumn = new Array(size).fill(0)
  const fill = (row: number): boolean => {
    if (row === size) return true
    const order = shuffle(
      Array.from({ length: size }, (_unused, index) => index),
      random
    )
    const choose = (from: number, owed: number): boolean => {
      if (owed === 0) return fill(row + 1)
      for (let at = from; at < order.length; at++) {
        const col = order[at]
        const cell = cellAt(size, row, col)
        if (inColumn[col] === quota) continue
        if (neighboursOf(size, cell).some(other => placed.includes(other))) continue
        placed.push(cell)
        inColumn[col]++
        if (choose(at + 1, owed - 1)) return true
        placed.pop()
        inColumn[col]--
      }
      return false
    }
    return choose(0, quota)
  }
  return fill(0) ? placed : undefined
}

/**
 * The stars grouped into the regions that will hold them — each group is one region's seed.
 *
 * At one star a region seeds on its own star and there is nothing to pair. At two, the stars are paired
 * nearest-first and **the shortest free path between a pair is claimed with them**, which is what makes the
 * region connected by construction: growth only ever adds squares touching what the region already holds, so
 * a region seeded in one piece stays in one piece. Left to meet by growing, two seeds are walled apart by
 * their neighbours often enough to throw most draws away.
 */
const seedRegions = (size: number, stars: readonly number[], quota: number, random: () => number) => {
  if (quota === 1) return stars.map(cell => [cell])
  const claimed = new Set(stars)
  const seeds: number[][] = []
  for (const [from, to] of pairStars(size, stars, random)) {
    const path = pathBetween(size, from, to, claimed)
    if (!path) return undefined
    path.forEach(cell => claimed.add(cell))
    seeds.push([from, to, ...path])
  }
  return seeds
}

/** The stars paired off nearest-first, so a region has a short way to join its two. */
const pairStars = (size: number, stars: readonly number[], random: () => number): number[][] => {
  const loose = shuffle([...stars], random)
  const pairs: number[][] = []
  while (loose.length) {
    const from = loose.shift()!
    let nearest = 0
    let shortest = Infinity
    loose.forEach((to, index) => {
      const away = Math.abs(rowOf(size, from) - rowOf(size, to)) + Math.abs(colOf(size, from) - colOf(size, to))
      if (away < shortest) [shortest, nearest] = [away, index]
    })
    pairs.push([from, loose.splice(nearest, 1)[0]])
  }
  return pairs
}

/** The shortest way from one star to the other through squares no region has claimed, ends excluded. */
const pathBetween = (size: number, from: number, to: number, claimed: ReadonlySet<number>): number[] | undefined => {
  const cameFrom = new Map<number, number>([[from, -1]])
  const queue = [from]
  while (queue.length) {
    const cell = queue.shift()!
    if (cell === to) {
      const path: number[] = []
      for (let at = cameFrom.get(to)!; at !== from; at = cameFrom.get(at)!) path.push(at)
      return path
    }
    const [row, col] = [rowOf(size, cell), colOf(size, cell)]
    for (const [atRow, atCol] of [
      [row + 1, col],
      [row - 1, col],
      [row, col + 1],
      [row, col - 1],
    ]) {
      if (atRow < 0 || atRow >= size || atCol < 0 || atCol >= size) continue
      const at = cellAt(size, atRow, atCol)
      if (cameFrom.has(at) || (claimed.has(at) && at !== to)) continue
      cameFrom.set(at, cell)
      queue.push(at)
    }
  }
  return undefined
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
 *
 * `smallest` is the floor the spread may not push a region under, and it is the quota's own arithmetic: two
 * stars that may not touch need three squares to stand in, so a two-star board cannot have the one-square
 * region that opens a one-star board. Its opening gift is a three-in-a-line region instead.
 */
const regionTargets = (size: number, spread: number, smallest: number): number[] => {
  const shape = Array.from({ length: size }, (_unused, index) => (index + 1) ** spread)
  const scale = (size * size) / shape.reduce((total, part) => total + part, 0)
  return shape.map(part => Math.max(smallest, part * scale))
}

/**
 * Regions grown outwards from their seeds until every square is claimed.
 *
 * Each step feeds whichever region is furthest behind its target, so the sizes come out in the intended
 * spread. Growing orthogonally makes contiguity free.
 */
const growRegions = (
  size: number,
  seeds: readonly number[][],
  random: () => number,
  spread: number,
  smallest: number
): number[] | undefined => {
  const targets = regionTargets(size, spread, smallest)
  const regions: number[] = new Array(size * size).fill(-1)
  // As many regions as rows, each seeded with the stars it owes and whatever joins them.
  const sizes = seeds.map((cells, region) => {
    cells.forEach(cell => (regions[cell] = region))
    return cells.length
  })
  let left = regions.filter(at => at === -1).length
  while (left > 0) {
    const order = [...Array(seeds.length).keys()].sort(
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
  const { size, quota, regionSpread, techniqueCap, requires = [], requiresCount = 1 } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  // Two stars that may not touch need three squares; one star needs the one it stands on. A tier may ask
  // for more, and at two stars it usually should — see `minRegion`.
  const smallest = Math.max(options.minRegion ?? 0, quota * 2 - 1)
  let fallback: { board: StarBattlePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const stars = starSet(size, quota, random)
    if (!stars) continue
    const seeds = seedRegions(size, stars, quota, random)
    if (!seeds) continue
    const regions = growRegions(size, seeds, random, regionSpread, smallest)
    if (!regions) continue
    const solution = Array.from({ length: size * size }, (_unused, cell) => stars.includes(cell))
    const puzzle = { size, quota, regions }
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
