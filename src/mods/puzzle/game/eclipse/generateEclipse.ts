import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import { cellAt, type EclipsePuzzle, type Link, type Mark } from "./eclipse"
import { ECLIPSE_TECHNIQUES, solveEclipseByTechniques, techniqueRank, type EclipseTechniqueId } from "./techniques"

export type EclipsePuzzleWithAnswer = EclipsePuzzle & {
  solution: readonly Mark[]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: EclipseTechniqueId
}

export type EclipseOptions = {
  size: number
  /** The strongest deduction a board may demand. */
  techniqueCap: EclipseTechniqueId
  /**
   * Rungs the board must actually TURN ON. The solver only ever reaches for the cheapest technique that
   * fires, so a solve whose hardest step is one of these is a board that stalls without it — a guarantee
   * the reasoning is needed rather than a hope it turns up. Any one of them satisfies the gate.
   */
  requires?: EclipseTechniqueId[]
  /**
   * How many times a required rung has to fire.
   *
   * One is not a tier. A board of thirty forced sign-reads and a single hard step is the tier below it with a
   * moment of thought in the middle, which is exactly how the top tier read before this existed.
   */
  requiresCount?: number
}

// A tier that insists on a rung throws boards away, so the ceiling sits well above the one or two draws
// an unconstrained tier needs.
const MAX_ATTEMPTS = 60

// One pass over the cells and one over the signs. Measured: a second sweep removed nothing on any tier — the
// first pass already lands on the fixpoint — and it doubles generation cost, which the top tier cannot afford
// (a top-tier board with its rung quota to meet is already most of a second to draw).
const MAX_SWEEPS = 1

export const techniquesUpTo = (cap: EclipseTechniqueId): EclipseTechniqueId[] =>
  ECLIPSE_TECHNIQUES.filter(id => techniqueRank(id) <= techniqueRank(cap))

const rows = (size: number) =>
  Array.from({ length: size }, (_unused, row) => Array.from({ length: size }, (_u, col) => cellAt(size, row, col)))

const cols = (size: number) =>
  Array.from({ length: size }, (_unused, col) => Array.from({ length: size }, (_u, row) => cellAt(size, row, col)))

/** A full board obeying all three grid rules, drawn by backtracking so no rejection loop is needed. */
const solutionGrid = (size: number, random: () => number): Mark[] | undefined => {
  const marks: (Mark | undefined)[] = new Array(size * size).fill(undefined)
  const half = size / 2
  const fits = (cell: number, mark: Mark): boolean => {
    const row = Math.floor(cell / size)
    const col = cell % size
    const rowCells = Array.from({ length: size }, (_unused, index) => cellAt(size, row, index))
    const colCells = Array.from({ length: size }, (_unused, index) => cellAt(size, index, col))
    if (rowCells.filter(held => marks[held] === mark).length >= half) return false
    if (colCells.filter(held => marks[held] === mark).length >= half) return false
    // Only the two cells behind this one can complete a run, since the board fills in reading order.
    if (col >= 2 && marks[cell - 1] === mark && marks[cell - 2] === mark) return false
    if (row >= 2 && marks[cell - size] === mark && marks[cell - size * 2] === mark) return false
    // No line may copy another of its own kind. Checked as a line completes, which for a board filled in
    // reading order is the last cell of a row, and the bottom cell of a column.
    const would = (at: number) => (at === cell ? mark : marks[at])
    const copies = (line: number[], others: number[][]) =>
      others.some(other => other.every((at, index) => would(at) === would(line[index])))
    if (col === size - 1 && copies(rowCells, rows(size).slice(0, row))) return false
    if (row === size - 1 && copies(colCells, cols(size).slice(0, col))) return false
    return true
  }
  const fill = (cell: number): boolean => {
    if (cell === size * size) return true
    for (const mark of shuffle(["sun", "moon"] as Mark[], random)) {
      if (!fits(cell, mark)) continue
      marks[cell] = mark
      if (fill(cell + 1)) return true
      marks[cell] = undefined
    }
    return false
  }
  return fill(0) ? (marks as Mark[]) : undefined
}

/** Every sign the solution implies, one per pair of neighbours. */
const allLinks = (size: number, solution: readonly Mark[]): Link[] =>
  Array.from({ length: size }, (_unused, row) =>
    Array.from({ length: size }, (_u, col) => {
      const cell = cellAt(size, row, col)
      const neighbours = [col + 1 < size ? cell + 1 : undefined, row + 1 < size ? cell + size : undefined]
      return neighbours.flatMap<Link>(neighbour =>
        neighbour === undefined
          ? []
          : [{ a: cell, b: neighbour, kind: solution[cell] === solution[neighbour] ? "same" : "different" }]
      )
    }).flat()
  ).flat()

const settles = (puzzle: EclipsePuzzle, allowed: EclipseTechniqueId[], solution: readonly Mark[]) => {
  const result = solveEclipseByTechniques(puzzle, allowed)
  return result.settled && result.marks.every((mark, cell) => mark === solution[cell]) ? result : undefined
}

/**
 * Build then thin, the way futoshiki generates: draw a full board, write down every sign it implies, then
 * take signs and given cells away for as long as the technique solver still reaches the end unaided.
 *
 * Every intermediate board is settled by deduction, so the one that ships is too — and that settles
 * uniqueness at the same time, since each step along the way was forced. No solution counter is needed.
 */
const thin = (
  size: number,
  solution: readonly Mark[],
  allowed: EclipseTechniqueId[],
  random: () => number
): EclipsePuzzle => {
  let given: (Mark | undefined)[] = [...solution]
  let links = allLinks(size, solution)
  // **Givens go first, and the order is the whole difference between this family and a filled-in grid.**
  // Thin the signs first and every one of them comes off: a board that still has most of its answer written
  // in it needs no signs at all, so the loop strips them and ships a board with none. Empty the cells first
  // and the signs become load-bearing, which is what makes the later pass keep them.
  //
  for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
    let removed = false
    for (const cell of shuffle(
      Array.from({ length: size * size }, (_unused, index) => index),
      random
    )) {
      if (given[cell] === undefined) continue
      const candidate = given.map((mark, index) => (index === cell ? undefined : mark))
      if (!settles({ size, given: candidate, links }, allowed, solution)) continue
      given = candidate
      removed = true
    }
    for (const link of shuffle(links, random)) {
      const candidate = links.filter(kept => kept !== link)
      if (!settles({ size, given, links: candidate }, allowed, solution)) continue
      links = candidate
      removed = true
    }
    if (!removed) break
  }
  return { size, given, links }
}

// How many times the tier's own rungs fired. A board is kept on this, and a near miss ranked by it.
const demandedRungs = (steps: readonly { technique: EclipseTechniqueId }[], requires: readonly EclipseTechniqueId[]) =>
  steps.filter(step => requires.includes(step.technique)).length

// The gate itself, named once so the loop below and `grade` cannot come to disagree about it.
const meetsDemand = (
  steps: readonly { technique: EclipseTechniqueId }[],
  requires: readonly EclipseTechniqueId[],
  requiresCount: number
) => !requires.length || demandedRungs(steps, requires) >= requiresCount

/**
 * Whether this board is one the loop below would have kept, and what the ladder needed to settle it
 * (docs/offline-puzzle-seeds.md).
 *
 * Both go through `meetsDemand`, so an offline pass filtering seeds by this admits exactly the boards
 * this generator accepts. That matters more here than elsewhere: when no attempt hits the tier's quota the
 * loop ships its nearest miss rather than throwing, so whether a board was accepted or settled for
 * cannot be read off the fact that one came back.
 */
export const gradeEclipse = (board: EclipsePuzzleWithAnswer, options: EclipseOptions): Grade | null => {
  const { techniqueCap, requires = [], requiresCount = 1 } = options
  const result = settles(board, techniquesUpTo(techniqueCap), board.solution)
  if (!result || !meetsDemand(result.steps, requires, requiresCount)) return null
  return { steps: result.steps.length, deepest: result.deepest }
}

export const generateEclipse = (
  seed: number,
  options: EclipseOptions,
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): EclipsePuzzleWithAnswer => {
  const { size, techniqueCap, requires = [], requiresCount = 1 } = options
  const allowed = techniquesUpTo(techniqueCap)
  const random = mulberry32(seed)
  let fallback: { board: EclipsePuzzleWithAnswer; demanded: number } | undefined
  for (let attempt = 0; attempt < attempts; attempt++) {
    const solution = solutionGrid(size, random)
    if (!solution) continue
    const puzzle = thin(size, solution, allowed, random)
    const result = settles(puzzle, allowed, solution)
    if (!result) continue
    const board = { ...puzzle, solution, techniqueCap }
    // A board that never needed the tier's own rung teaches the tier below it, so it is only kept if
    // nothing better turns up.
    if (meetsDemand(result.steps, requires, requiresCount)) return board
    const demanded = demandedRungs(result.steps, requires)
    // The nearest miss is the fallback, so a tier that cannot hit its quota still ships its hardest draw.
    if (!fallback || demanded > fallback.demanded) fallback = { board, demanded }
  }
  if (!fallback) throw new Error(`eclipse: no board for size ${size} at ${techniqueCap}`)
  return fallback.board
}

/** How full a board ships — read off the generated board, for the playtesting bench. */
export const eclipseGivenCount = (puzzle: EclipsePuzzle) => puzzle.given.filter(mark => mark !== undefined).length
