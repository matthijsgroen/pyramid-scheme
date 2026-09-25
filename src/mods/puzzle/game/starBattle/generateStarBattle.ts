import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import { cellAt, colOf, neighboursOf, regionCells, rowOf, type StarBattlePuzzle } from "./starBattle"
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
  /**
   * Refuse a map with a region that sits inside one row or one column.
   *
   * **The gift this family could not see it was giving.** Such a region spends its line before the player
   * has read anything — `regionLine` fires on the opening move — and every board this generator kept had
   * two or three of them, because the rest of the ladder needs a narrow group to start counting from. The
   * LinkedIn Queens board measured in the design doc has none, which is why the ladder without
   * `wouldStrand` made no move on it at all.
   */
  noLineRegions?: boolean
  /**
   * The earliest step at which the first star may land.
   *
   * **A board that opens with a star had its opening handed over**: five of eight measured 8×8 boards
   * placed one on step 0 or 1. The Queens board eliminates for six steps first, and that opening is what
   * this buys. Requiring a rung cannot buy it — a tier's rung may fire anywhere in the solve, and on that
   * board `spanning` fires at step fifteen.
   */
  firstStarAfter?: number
  /**
   * The most steps a board may have that place TWO stars at once.
   *
   * A line down to three free squares owing two stars has one filling — both ends — so a whole pair lands
   * on a move nobody had to think about, and a board full of those reads as bookkeeping however hard its
   * opening was. Playtesting counted four to seven a board at junior and two to five higher up. Only
   * meaningful at two stars a group: at one star no step can place a pair.
   */
  mostPairsAtOnce?: number
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

/**
 * The stars paired off, one pair to a region — **and a pair on one row or one column is avoided rather than
 * reached for.**
 *
 * The obvious pairing is nearest-first by walking distance, and it has a shape nobody chose. Two stars may
 * not touch, so the only partners at walking distance two are two along a row or two down a column: the
 * diagonal neighbour at distance two is `(1,1)`, which touches. Nearest-by-walking-distance therefore picks
 * an ALIGNED partner whenever one exists, and on a board this dense one always does. Every region's pair
 * came out on a shared line, which is a pattern a player reads off the board long before they read the
 * rules.
 *
 * So an aligned partner is charged two squares of extra distance. That is enough to lose to the knight-shaped
 * neighbour at `(1,2)` — the nearest partner that shares neither row nor column — and not enough to reach
 * across the board, which keeps the corridor short and the draw cheap.
 *
 * **It cannot be driven to zero, and should not be.** A region whose squares all sit in one line is what
 * `regionLine` reads, and such a region's two stars are necessarily in that line — so a board with no
 * aligned pair at all has taken its own top rungs away. The tiers that demand those rungs settle around two
 * in five; the ones that do not, around one in four.
 */
const ALIGNED_PENALTY = 2

const pairStars = (size: number, stars: readonly number[], random: () => number): number[][] => {
  const loose = shuffle([...stars], random)
  const pairs: number[][] = []
  while (loose.length) {
    const from = loose.shift()!
    const away = (to: number) => {
      const [rows, cols] = [
        Math.abs(rowOf(size, from) - rowOf(size, to)),
        Math.abs(colOf(size, from) - colOf(size, to)),
      ]
      return rows + cols + (rows === 0 || cols === 0 ? ALIGNED_PENALTY : 0)
    }
    let nearest = 0
    let shortest = Infinity
    // The loose order is shuffled, so the first of several equally good partners is a random one of them.
    loose.forEach((to, index) => {
      if (away(to) < shortest) [shortest, nearest] = [away(to), index]
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
    // THE TIEBREAK IS DRAWN BEFORE THE SORT, NOT INSIDE IT. A comparator that draws from the seeded
    // stream is not portable: how many comparisons a sort makes is the ENGINE's choice — V8 sorts with
    // TimSort, JavaScriptCore with a merge sort — so the stream advances a different number of times and
    // the same seed builds a different board on a phone than on the machine its seed was proven on.
    // Measured: 17 of this family's 42 proven seeds fail to build under a merge sort.
    //
    // Drawn per region instead, the comparator becomes total and deterministic, so every correct sort
    // agrees and a seed means the same board everywhere.
    const jitter = seeds.map(() => random())
    const order = [...Array(seeds.length).keys()].sort(
      (a, b) => sizes[a] / targets[a] - sizes[b] / targets[b] || jitter[a] - jitter[b]
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
// How many times the tier's own rungs fired. A board is kept on this, and a near miss ranked by it.
const demandedRungs = (
  steps: readonly { technique: StarBattleTechniqueId }[],
  requires: readonly StarBattleTechniqueId[]
) => steps.filter(step => requires.includes(step.technique)).length

// The gate itself, named once so the loop below and `grade` cannot come to disagree about it.
const meetsDemand = (
  steps: readonly { technique: StarBattleTechniqueId }[],
  requires: readonly StarBattleTechniqueId[],
  requiresCount: number
) => !requires.length || demandedRungs(steps, requires) >= requiresCount

/** Whether every region touches more than one row and more than one column. */
const noRegionOnALine = (puzzle: StarBattlePuzzle) =>
  regionCells(puzzle).every(
    cells =>
      new Set(cells.map(cell => rowOf(puzzle.size, cell))).size > 1 &&
      new Set(cells.map(cell => colOf(puzzle.size, cell))).size > 1
  )

/** How long the board makes the player eliminate before the first star lands. */
const firstStarStep = (steps: readonly { decisions: readonly { mark: string }[] }[]) =>
  steps.findIndex(step => step.decisions.some(decision => decision.mark === "star"))

// Every gate a board is kept on beyond "the ladder settles it", in one place so the loop and `grade` cannot
// come to disagree — an offline seed pass filtering by `grade` has to admit exactly what the loop keeps.
const meetsShape = (
  puzzle: StarBattlePuzzle,
  steps: readonly { technique: StarBattleTechniqueId; decisions: readonly { mark: string }[] }[],
  options: StarBattleOptions
) => {
  const { requires = [], requiresCount = 1, firstStarAfter = 0, mostPairsAtOnce } = options
  if (!meetsMapShape(puzzle, options)) return false
  if (!meetsDemand(steps, requires, requiresCount)) return false
  if (firstStarStep(steps) < firstStarAfter) return false
  return mostPairsAtOnce === undefined || pairsAtOnce(steps) <= mostPairsAtOnce
}

/** Steps that hand over a whole pair — the move a player makes without thinking. */
const pairsAtOnce = (steps: readonly { decisions: readonly { mark: string }[] }[]) =>
  steps.filter(step => step.decisions.filter(decision => decision.mark === "star").length > 1).length

// The half of the gate that reads the MAP alone, so the loop can throw a draw away before paying for a
// solve — and with `wouldStrand` in the ladder a solve is the expensive part of a draw by two orders.
const meetsMapShape = (puzzle: StarBattlePuzzle, { noLineRegions }: StarBattleOptions) =>
  !noLineRegions || noRegionOnALine(puzzle)

/**
 * Whether this board is one the loop below would have kept, and what the ladder needed to settle it
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * Both go through `meetsDemand`, so an offline pass filtering seeds by this admits exactly the boards
 * this generator accepts. That matters more here than elsewhere: when no attempt hits the tier's quota the
 * loop ships its nearest miss rather than throwing, so whether a board was accepted or settled for
 * cannot be read off the fact that one came back.
 */
export const gradeStarBattle = (board: StarBattlePuzzleWithAnswer, options: StarBattleOptions): Grade | null => {
  const result = settles(board, techniquesUpTo(options.techniqueCap), board.solution)
  if (!result || !meetsShape(board, result.steps, options)) return null
  return { steps: result.steps.length, deepest: result.deepest }
}

export const generateStarBattle = (
  seed: number,
  options: StarBattleOptions,
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): StarBattlePuzzleWithAnswer => {
  const { size, quota, regionSpread, techniqueCap, requires = [] } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  // Two stars that may not touch need three squares; one star needs the one it stands on. A tier may ask
  // for more, and at two stars it usually should — see `minRegion`.
  const smallest = Math.max(options.minRegion ?? 0, quota * 2 - 1)
  let fallback: { board: StarBattlePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < attempts; attempt++) {
    const stars = starSet(size, quota, random)
    if (!stars) continue
    const seeds = seedRegions(size, stars, quota, random)
    if (!seeds) continue
    const regions = growRegions(size, seeds, random, regionSpread, smallest)
    if (!regions) continue
    const solution = Array.from({ length: size * size }, (_unused, cell) => stars.includes(cell))
    const puzzle = { size, quota, regions }
    if (!meetsMapShape(puzzle, options)) continue
    const result = settles(puzzle, allowed, solution)
    if (!result) continue
    const board = { ...puzzle, solution, techniqueCap }
    // A board that never needed the tier's own rung teaches the tier below it, so it is only kept if
    // nothing better turns up.
    if (meetsShape(puzzle, result.steps, options)) return board
    const demanded = demandedRungs(result.steps, requires)
    // The nearest miss is the fallback, so a tier that cannot hit its quota still ships its hardest draw.
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`star battle: no board for size ${size} at ${techniqueCap}`)
  return fallback.board
}
