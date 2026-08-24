import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import { hexDistance, hexKey, hexNeighbours, hexRing, hexagon, type Hex } from "./hex"
import { PRUNINGS, solveHidatoByTechniques, type HidatoPuzzleData, type PruningId } from "./techniques"

export type HidatoPuzzle = HidatoPuzzleData & {
  /** The run the board was carved from, by cell key — what a mistake is measured against. */
  solution: Record<string, number>
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  pruning: PruningId
}

export type HidatoOptions = {
  /** The hexagon the comb is carved out of — its radius in cells (design doc §5). */
  radius: number
  /** How many cells the comb has, i.e. the last number on the board. */
  cells: number
  /** The strongest reading a board may demand (design doc §5). */
  pruning: PruningId
  /**
   * The fewest numbers that ship written in. A floor, not a quota: the board is thinned to what its
   * own deduction needs first, and topped up from the run afterwards — so the extra numbers are a gift
   * to the player rather than something the thinning was measured against.
   */
  givens: number
  /** The rung the board must genuinely turn on: it has to STALL one level below this (design doc §5.2). */
  requires?: PruningId
  /**
   * How often the walk ignores its own heuristic and steps somewhere at random, 0–1 (design doc §3.3).
   *
   * Warnsdorff on its own hugs the boundary, because a boundary cell is the one with the fewest ways
   * out. Left to it, the answer laps the rim — which a player learns to expect. This is the dial that
   * breaks the habit; `rimStreak` is what checks it worked.
   */
  wander?: number
  /**
   * The longest stretch of the run allowed to sit on the comb's outer ring (design doc §3.3). Unset =
   * no limit, which is right for the smallest comb: a lap of a 14-cell hive is most of the board.
   */
  rimStreak?: number
}

// A tier that insists on a rung throws attempts away, and the walk itself can come up short, so the
// ceiling sits far above the handful a plain draw needs.
const MAX_ATTEMPTS = 200

// Retries inside one attempt: a walk that paints itself into a corner is not a bad seed, it is a bad
// turn, and starting the same seed's walk again is far cheaper than judging a whole board.
const MAX_WALKS = 400

/**
 * The shape of the comb: the full hexagon one size down, plus a contiguous arc of the next ring out.
 *
 * **An arc rather than a scatter**, and that is the whole of the shape design. Letting the walk wander
 * a radius-2 hexagon for 14 of its 19 cells produced a ring with a hole through the middle — a comb
 * that reads as broken, and a board that is nearly a corridor, since a ring offers a run almost no
 * choice of route. Fixing the region first and then covering all of it keeps every board a hive with
 * its outer row part-built.
 */
const combShape = (radius: number, count: number, random: () => number): Hex[] => {
  const inner = hexagon(radius - 1)
  const ring = hexRing(radius)
  const from = Math.floor(random() * ring.length)
  const arc = Array.from(
    { length: Math.max(0, count - inner.length) },
    (_unused, along) => ring[(from + along) % ring.length]
  )
  return [...inner, ...arc].slice(0, count)
}

/**
 * The run, carved before anything else — a self-avoiding walk covering every cell of the comb.
 *
 * Carving the answer first is what makes the board free of a path search: the walk IS the answer, so a
 * board is a Hamiltonian path by construction and nothing ever looks for one. What the walk has to do
 * is cover the shape it was given, which is why it may fail and be started again.
 */
const carveRun = (
  radius: number,
  count: number,
  { wander = 0, rimStreak }: Pick<HidatoOptions, "wander" | "rimStreak">,
  random: () => number
): Hex[] | undefined => {
  const shape = combShape(radius, count, random)
  const inside = new Set(shape.map(hexKey))
  const openings = (cell: Hex, used: Set<string>) =>
    hexNeighbours(cell).filter(next => inside.has(hexKey(next)) && !used.has(hexKey(next)))

  for (let walk = 0; walk < MAX_WALKS; walk++) {
    const start = shape[Math.floor(random() * shape.length)]
    const trail = [start]
    const used = new Set([hexKey(start)])
    while (trail.length < count) {
      const options = openings(trail[trail.length - 1], used)
      if (!options.length) break
      // Warnsdorff: step into the cell with the fewest ways out of its own. A walk that leaves those
      // for later strands them, and a stranded cell is the walk failing rather than a board being hard.
      //
      // `wander` is what stops it also being a habit: some of the time the walk takes any open cell
      // instead, which is what lets it leave the rim and come back (design doc §3.3).
      const tightest = Math.min(...options.map(option => openings(option, used).length))
      const choices = random() < wander ? options : options.filter(option => openings(option, used).length === tightest)
      trail.push(shuffle(choices, random)[0])
      used.add(hexKey(trail[trail.length - 1]))
    }
    if (trail.length !== count) continue
    if (rimStreak !== undefined && longestRimLap(trail, radius) > rimStreak) continue
    return trail
  }
  return undefined
}

/**
 * The longest stretch of the run that stays on the comb's outer ring — the measure of "it just goes
 * round the outside", and the one thing about a run's SHAPE the generator judges (design doc §3.3).
 */
const longestRimLap = (trail: Hex[], radius: number): number => {
  let longest = 0
  let streak = 0
  for (const cell of trail) {
    streak = hexDistance({ q: 0, r: 0 }, cell) === radius ? streak + 1 : 0
    longest = Math.max(longest, streak)
  }
  return longest
}

// Sorted by row, then along it — the reading order of the comb. Deliberately NOT the order the run
// visits them: the cells ship with the board, so their order must say nothing about the answer.
const inReadingOrder = (cells: Hex[]): Hex[] => [...cells].sort((a, b) => a.r - b.r || a.q - b.q)

/**
 * Whether this board is one the loop below would have kept, and what the ladder needed to settle it
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * The weakest rung that settles the board is BOTH halves of the gate at once: past the tier's cap it is
 * a board the tier may not ask for, and short of what the tier requires it is a board that never turns
 * the reasoning on.
 */
export const gradeHidato = (board: HidatoPuzzle, options: HidatoOptions): Grade | null => {
  const solves = PRUNINGS.map(pruning => ({ pruning, result: solveHidatoByTechniques(board, pruning) }))
  const weakest = solves.find(({ result }) => result.settled)
  if (!weakest) return null
  if (PRUNINGS.indexOf(weakest.pruning) > PRUNINGS.indexOf(options.pruning)) return null
  if (options.requires && weakest.pruning !== options.requires) return null
  return { steps: weakest.result.steps.length, deepest: weakest.pruning }
}

export const generateHidato = (
  seed: number,
  options: HidatoOptions,
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): HidatoPuzzle => {
  const { radius, cells: count, pruning, givens: floor } = options
  for (let attempt = 0; attempt < attempts; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const run = carveRun(radius, count, options, random)
    if (!run) continue

    const cells = inReadingOrder(run)
    const solution = Object.fromEntries(run.map((cell, index) => [hexKey(cell), index + 1]))

    // Thinned from the whole answer downward, for as long as the ladder still reaches the end unaided.
    // Every intermediate board is settled by forced steps, so the one that ships is too — and that
    // settles uniqueness with it, since a forced step admits no second answer.
    let givens = { ...solution }
    for (const key of shuffle(Object.keys(solution), random)) {
      // The two ends stay. A run with an unknown start is a board asking where to begin, which is a
      // guess rather than a deduction — and the first and last number are what every other reason
      // eventually leans on.
      if (givens[key] === 1 || givens[key] === count) continue
      const trial = { ...givens }
      delete trial[key]
      if (solveHidatoByTechniques({ cells, givens: trial }, pruning).settled) givens = trial
    }

    // Then the gift: numbers handed back on top of a board already thinned without them, so the tier's
    // generosity never costs the board the rung it was accepted for.
    //
    // **Each one is offered and then judged**, rather than the lot of them handed over and the board
    // judged once at the end. A written-in number can retire the very reasoning the tier asked for —
    // three of them turned every master board back into one the gentlest rung settles — so a gift that
    // would soften the board past its tier is taken back off and the next cell tried instead.
    for (const key of shuffle(
      cells.map(hexKey).filter(key => givens[key] === undefined),
      random
    )) {
      if (Object.keys(givens).length >= floor) break
      givens[key] = solution[key]
      if (!gradeHidato({ cells, givens, solution, pruning }, options)) delete givens[key]
    }

    const board: HidatoPuzzle = { cells, givens, solution, pruning }
    if (gradeHidato(board, options)) return board
  }
  throw new Error(`generateHidato: no board meeting the tier's gates (cells=${count}, seed=${seed})`)
}
