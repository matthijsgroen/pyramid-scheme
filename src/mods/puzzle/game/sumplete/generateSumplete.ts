import { mulberry32 } from "@/game/random"
import { solveByTechniques, type TechniqueId } from "./techniques"

export type SumpleteGrid = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  solution: boolean[][]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: TechniqueId
}

export type SumpleteOptions = {
  /** The strongest deduction a board may demand. Lower caps make gentler boards (design doc §5). */
  techniqueCap?: TechniqueId
  /** Highest cell value; the range is 1..maxValue. */
  maxValue?: number
}

// Generation is draw-and-reject, per docs/game-design/puzzles/sumplete.md §3. The naive construction
// (random keep-mask, targets read off it) is what produces lone-number answers, zero targets and
// boards that need a guess — so a candidate only survives if every line keeps at least two cells and
// strikes at least one, AND the technique solver settles the whole board.
//
// That last gate also settles uniqueness: a board decided by forced steps alone has no second
// solution, so there is no separate solution-counter to run (which is what lets this scale past 4x4,
// since counting solutions is exponential).
const MAX_ATTEMPTS = 500
const MAX_MASK_DRAWS = 500

const gatesHold = (solution: boolean[][]): boolean => {
  const size = solution.length
  const lineOk = (kept: number) => kept >= 2 && kept <= size - 1
  return (
    solution.every(row => lineOk(row.filter(Boolean).length)) &&
    solution[0].every((_, col) => lineOk(solution.filter(row => row[col]).length))
  )
}

// Redrawn until the keep/strike gates hold, so the outer attempt loop only ever spends a solver run
// on a candidate that already passed them. At 4x4 a coin-flip mask satisfies the gates about 4% of
// the time, so mixing the two loops would waste most attempts on boards rejected for free.
const drawMask = (random: () => number, gridSize: number): boolean[][] | undefined => {
  for (let draw = 0; draw < MAX_MASK_DRAWS; draw++) {
    const mask = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => random() < 0.5))
    if (gatesHold(mask)) return mask
  }
  return undefined
}

export const generateSumplete = (gridSize: number, seed: number, options: SumpleteOptions = {}): SumpleteGrid => {
  const { techniqueCap = "inEveryCombination", maxValue = 9 } = options
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const solution = drawMask(random, gridSize)
    if (!solution) continue
    const grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => Math.floor(random() * maxValue) + 1)
    )
    const rowTargets = grid.map((row, i) => row.reduce((sum, value, j) => sum + (solution[i][j] ? value : 0), 0))
    const colTargets = grid[0].map((_, j) => grid.reduce((sum, row, i) => sum + (solution[i][j] ? row[j] : 0), 0))
    const puzzle = { grid, rowTargets, colTargets }
    if (solveByTechniques(puzzle, techniqueCap).settled) return { ...puzzle, solution, techniqueCap }
  }
  throw new Error(`generateSumplete: no logically solvable board (gridSize=${gridSize}, seed=${seed})`)
}
