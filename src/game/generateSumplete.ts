import { mulberry32 } from "./random"
import { countSolutions } from "./uniquenessVerifier"

export type SumpleteGrid = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  solution: boolean[][]
}

export type SumpleteOptions = {
  /** Allow rows/columns where no cell is included (target = 0). Default true. Set false for medium/hard. */
  allowZeroTargets?: boolean
}

export const generateSumplete = (gridSize: number, seed: number, options: SumpleteOptions = {}): SumpleteGrid => {
  const { allowZeroTargets = true } = options
  for (let attempt = 0; attempt < 20; attempt++) {
    const random = mulberry32(seed + attempt)
    const solution: boolean[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => random() < 0.5)
    )
    const grid: number[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => Math.floor(random() * 9) + 1)
    )
    const rowTargets = Array.from({ length: gridSize }, (_, i) =>
      grid[i].reduce((sum, val, j) => sum + (solution[i][j] ? val : 0), 0)
    )
    const colTargets = Array.from({ length: gridSize }, (_, j) =>
      grid.reduce((sum, row, i) => sum + (solution[i][j] ? row[j] : 0), 0)
    )
    if (!allowZeroTargets && [...rowTargets, ...colTargets].some(t => t === 0)) continue
    if (countSolutions(grid, rowTargets, colTargets) === 1) {
      return { grid, rowTargets, colTargets, solution }
    }
  }
  throw new Error(`generateSumplete: no unique puzzle found (gridSize=${gridSize}, seed=${seed})`)
}
