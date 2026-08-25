import type { Grade } from "@/game/families/familyMeta"
import { mulberry32, shuffle } from "@/game/random"
import { techniquesBelow, techniquesFor, type DemandId } from "./demands"
import {
  peersOf,
  solveSudokuByTechniques,
  type SudokuCellRef,
  type SudokuPuzzleData,
  type SudokuShape,
  type TechniqueId,
} from "./techniques"

export type SudokuPuzzle = SudokuPuzzleData & {
  solution: number[][]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: DemandId
}

export type SudokuOptions = {
  /** The strongest deduction a board may demand (design doc §5). */
  techniqueCap?: DemandId
  /**
   * The fewest squares that ship filled in (design doc §5.1). A FLOOR on the digging rather than a
   * quota: squares come out one at a time for as long as the ladder still reaches the end unaided,
   * and the floor is where that stops early. So a gentle tier is not handed a board thinned to the
   * bone and then propped back up — it is a board that was never thinned that far.
   */
  minGivens?: number
  /**
   * The gentlest rung the board may not fall short of (design doc §5.3), and the dig's own target.
   *
   * Stated as "the ladder below this one leaves the board standing", which is the only form of the
   * claim that means anything: reading back the hardest step a solve HAPPENED to take proves nothing,
   * because a cheapest-first solver reaches the dear step only where the cheap ones have run out. So
   * a board that demands `boxLine` is one the singles alone cannot finish — the player genuinely has
   * to look at a chamber against the lines crossing it.
   */
  demands?: DemandId
}

/** The one grid this family is authored at: 6 wide, cut into chambers 2 across and 3 down. */
export const SUDOKU_SIZE = 6
export const SUDOKU_BOX_WIDTH = 2
export const SUDOKU_BOX_HEIGHT = 3

// Generation is fill-then-dig, per docs/game-design/puzzles/sudoku.md §3: draw a full grid, then take
// squares away for as long as the technique solver still reaches the end unaided. Every intermediate
// board is settled by deduction, so the one that ships is too — and that also settles uniqueness,
// since each step along the way was forced. No separate solution counter has to run.
//
// The ceiling is set by the LIVE fallback rather than by the offline pass, which is the only place it
// is ever spent: a listed seed is built in exactly one attempt (`puzzle-screens.md` §6.1), and the
// offline pass tests one attempt per seed too, so this number governs the path taken when a bucket is
// missing — a tier being tuned, or the lab. The top tier's rung is rare on a grid this small (about
// one dig in fifty, design doc §3.1), so the loop would happily spend hundreds of attempts; sixty is
// about 1.8s of a phone's main thread, and past that a board nobody is waiting for costs more than the
// rung is worth. What comes back then is the nearest miss below, never nothing.
const MAX_ATTEMPTS = 60

// How many removable squares the dig inspects for one that defeats the gentler ladder, before
// settling for an ordinary removal. The squares that break a ladder turn up at the end of a dig,
// where the board has few enough left that the whole remainder is inspected anyway — a square that
// cannot come out at all is not one of the looks — so a wider sweep at the start buys nothing and
// costs a solve per square per removal.
const LOOKS_FOR_A_BREAKER = 8

/** A filled grid: every value once per row, once per column and once per chamber. */
const solutionGrid = (shape: SudokuShape, random: () => number): number[][] => {
  const { size } = shape
  const grid = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const fits = (row: number, col: number, value: number) =>
    !peersOf(shape, row, col).some(peer => grid[peer.row][peer.col] === value)
  const fill = (index: number): boolean => {
    if (index === size * size) return true
    const row = Math.floor(index / size)
    const col = index % size
    for (const value of shuffle(
      Array.from({ length: size }, (_unused, i) => i + 1),
      random
    )) {
      if (!fits(row, col, value)) continue
      grid[row][col] = value
      if (fill(index + 1)) return true
      grid[row][col] = 0
    }
    return false
  }
  fill(0)
  return grid
}

const allCells = (size: number): SudokuCellRef[] =>
  Array.from({ length: size }, (_unused, row) => Array.from({ length: size }, (_unused2, col) => ({ row, col }))).flat()

const filledCount = (givens: (number | undefined)[][]): number =>
  givens.flat().filter(value => value !== undefined).length

const filledCells = (givens: (number | undefined)[][]): SudokuCellRef[] =>
  allCells(givens.length).filter(cell => givens[cell.row][cell.col] !== undefined)

/**
 * Whether this board is one the loop below would have kept, and what the ladder needed to settle it
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * The loop calls it on the finished board — after the digging that decides it — so it is the gate
 * rather than a second opinion about it.
 */
export const gradeSudoku = (board: SudokuPuzzle, options: SudokuOptions = {}): Grade | null => {
  const { techniqueCap: cap = "boxLine", demands } = options
  const result = solveSudokuByTechniques(board, techniquesFor(cap))
  if (!result.settled) return null
  if (demands && solveSudokuByTechniques(board, techniquesBelow(demands)).settled) return null
  return { steps: result.steps.length, deepest: result.deepest }
}

export const generateSudoku = (
  seed: number,
  options: SudokuOptions = {},
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): SudokuPuzzle => {
  const { techniqueCap: cap = "boxLine", minGivens = 0, demands } = options
  const allowed = techniquesFor(cap)
  const below = demands ? techniquesBelow(demands) : []
  const shape = { size: SUDOKU_SIZE, boxWidth: SUDOKU_BOX_WIDTH, boxHeight: SUDOKU_BOX_HEIGHT }
  let nearest: SudokuPuzzle | undefined

  const settles = (givens: (number | undefined)[][], ladder: readonly TechniqueId[]) =>
    solveSudokuByTechniques({ ...shape, givens }, ladder).settled

  for (let attempt = 0; attempt < attempts; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const solution = solutionGrid(shape, random)

    // Squares come out one at a time, each removal kept only if the tier's ladder still finishes the
    // board without it. Which square goes next is where the tier's rung is actually WON: while the
    // gentler ladder can still finish the board, the dig looks for a removal that stops it, and takes
    // an ordinary one only when the look comes up empty. A plain random dig practically never lands a
    // 6x6 that needs more than a single — the grid is too small for the harder reasons to be forced
    // by accident (design doc §3.1).
    let givens: (number | undefined)[][] = solution.map(row => [...row])
    let striving = below.length > 0
    for (;;) {
      if (filledCount(givens) <= minGivens) break
      let breaker: (number | undefined)[][] | undefined
      let ordinary: (number | undefined)[][] | undefined
      let looked = 0
      for (const cell of shuffle(filledCells(givens), random)) {
        const trial = givens.map(row => [...row])
        trial[cell.row][cell.col] = undefined
        if (!striving) {
          if (settles(trial, allowed)) {
            ordinary = trial
            break
          }
          continue
        }
        // The gentle ladder is asked FIRST: a board it can still finish is one the cap can finish
        // too, so the common answer costs one solve instead of two.
        if (settles(trial, below)) {
          ordinary ??= trial
          // Sweeping all 36 squares for a breaker that early digging cannot produce is most of what
          // this loop would cost. A handful of looks is enough while the board is still full, and the
          // sweep widens by itself as it empties, because a square that cannot come out at all is not
          // one of the looks.
          if (++looked >= LOOKS_FOR_A_BREAKER) break
          continue
        }
        if (settles(trial, allowed)) {
          breaker = trial
          break
        }
      }
      // A board the gentler ladder can no longer finish is one the tier's rung has to carry, and that
      // only becomes more true as further squares come out — so the search stops at the first breaker
      // and the rest of the dig is plain.
      if (breaker) striving = false
      const next = breaker ?? ordinary
      if (!next) break
      givens = next
    }

    const board = { ...shape, givens, solution, techniqueCap: cap }
    if (gradeSudoku(board, options)) return board
    // Not the tier's board, but a real one: solvable by the tier's own ladder, unique, and dug to the
    // same floor — it simply fell to a gentler reason than the tier asked for. Kept as the nearest
    // miss rather than thrown away, so a room whose bucket is missing gets a slightly gentler board
    // instead of no board at all. `grade` is what tells the two apart, which is why the offline pass
    // lists a seed only when it grades (`puzzle-screens.md` §6.1).
    nearest ??= board
  }
  if (nearest) return nearest
  throw new Error(`generateSudoku: no board at all (seed=${seed})`)
}
