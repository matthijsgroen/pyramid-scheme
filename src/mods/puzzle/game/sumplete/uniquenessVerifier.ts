export const countSolutions = (grid: number[][], rowTargets: number[], colTargets: number[]): 0 | 1 | 2 => {
  const n = grid.length
  const included: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  let count = 0

  const solve = (cellIndex: number): void => {
    if (count >= 2) return

    if (cellIndex === n * n) {
      for (let i = 0; i < n; i++) {
        let rowSum = 0
        let colSum = 0
        for (let j = 0; j < n; j++) {
          if (included[i][j]) rowSum += grid[i][j]
          if (included[j][i]) colSum += grid[j][i]
        }
        if (rowSum !== rowTargets[i] || colSum !== colTargets[i]) return
      }
      count++
      return
    }

    const row = Math.floor(cellIndex / n)
    const col = cellIndex % n

    const pruneCheck = (): boolean => {
      // Completed rows must match exactly
      for (let i = 0; i < row; i++) {
        let s = 0
        for (let j = 0; j < n; j++) if (included[i][j]) s += grid[i][j]
        if (s !== rowTargets[i]) return true
      }
      // Current partial row must not exceed target
      let partialRow = 0
      for (let j = 0; j < col; j++) if (included[row][j]) partialRow += grid[row][j]
      if (partialRow > rowTargets[row]) return true
      // Partial columns must not exceed their targets
      for (let j = 0; j < n; j++) {
        let partialCol = 0
        const maxRow = j < col ? row + 1 : row
        for (let i = 0; i < maxRow; i++) if (included[i][j]) partialCol += grid[i][j]
        if (partialCol > colTargets[j]) return true
      }
      return false
    }

    included[row][col] = true
    if (!pruneCheck()) solve(cellIndex + 1)

    if (count < 2) {
      included[row][col] = false
      if (!pruneCheck()) solve(cellIndex + 1)
    }
  }

  solve(0)
  return count as 0 | 1 | 2
}
