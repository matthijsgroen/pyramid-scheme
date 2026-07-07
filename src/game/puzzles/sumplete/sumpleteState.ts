import { produce } from "immer"

export type SumpleteCellState = "included" | "excluded" | "unknown"

export type SumpleteState = {
  cells: SumpleteCellState[][]
}

export const createSumpleteState = (gridSize: number): SumpleteState => ({
  cells: Array.from({ length: gridSize }, () => new Array<SumpleteCellState>(gridSize).fill("unknown")),
})

const cycle = (s: SumpleteCellState): SumpleteCellState =>
  s === "unknown" ? "excluded" : s === "excluded" ? "included" : "unknown"

export const toggleSumpleteCell = produce((state: SumpleteState, row: number, col: number) => {
  state.cells[row][col] = cycle(state.cells[row][col])
})
