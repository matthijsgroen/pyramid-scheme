import type { SumpleteMark } from "./techniques"

export type SumpleteLineStatus = "under" | "exact" | "over"

export type SumpleteLine = {
  /** What the line adds up to right now: every number not crossed out. */
  total: number
  target: number
  status: SumpleteLineStatus
}

// A line is judged on what is NOT crossed out, so an untouched board reads as "too high" and the
// player works downward — the same feedback the puzzle gives on paper.
const lineOf = (values: number[], marks: SumpleteMark[], target: number): SumpleteLine => {
  const total = values.reduce((sum, value, i) => sum + (marks[i] === "strike" ? 0 : value), 0)
  return { total, target, status: total === target ? "exact" : total > target ? "over" : "under" }
}

export const computeRowLines = (grid: number[][], cells: SumpleteMark[][], rowTargets: number[]): SumpleteLine[] =>
  grid.map((values, row) => lineOf(values, cells[row], rowTargets[row]))

export const computeColLines = (grid: number[][], cells: SumpleteMark[][], colTargets: number[]): SumpleteLine[] =>
  colTargets.map((target, col) =>
    lineOf(
      grid.map(values => values[col]),
      cells.map(row => row[col]),
      target
    )
  )

export const isSumpleteSolved = (rows: SumpleteLine[], cols: SumpleteLine[]): boolean =>
  [...rows, ...cols].every(line => line.status === "exact")
