import type { SumpleteCellState } from "./sumpleteState"

export type SumpleteLineStatus = "under" | "exact" | "over"

const statusFor = (sum: number, target: number): SumpleteLineStatus =>
  sum === target ? "exact" : sum > target ? "over" : "under"

export const computeRowStatuses = (
  grid: number[][],
  cells: SumpleteCellState[][],
  rowTargets: number[]
): SumpleteLineStatus[] =>
  cells.map((row, i) => {
    const sum = row.reduce((s, st, j) => s + (st !== "excluded" ? grid[i][j] : 0), 0)
    return statusFor(sum, rowTargets[i])
  })

export const computeColStatuses = (
  grid: number[][],
  cells: SumpleteCellState[][],
  colTargets: number[]
): SumpleteLineStatus[] =>
  colTargets.map((target, j) => {
    const sum = cells.reduce((s, row, i) => s + (row[j] !== "excluded" ? grid[i][j] : 0), 0)
    return statusFor(sum, target)
  })

export const isSumpleteSolved = (rowStatuses: SumpleteLineStatus[], colStatuses: SumpleteLineStatus[]): boolean =>
  rowStatuses.every(s => s === "exact") && colStatuses.every(s => s === "exact")
