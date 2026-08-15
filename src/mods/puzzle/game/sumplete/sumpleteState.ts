import { produce } from "immer"
import type { SumpleteMark } from "./techniques"

// The player's board uses the same vocabulary the solver reasons in, so a hint's decisions drop
// straight onto it: "unknown" is undecided, "strike" is crossed out, "keep" is a confirmed number.
export type SumpleteState = {
  cells: SumpleteMark[][]
}

export const createSumpleteState = (gridSize: number): SumpleteState => ({
  cells: Array.from({ length: gridSize }, () => new Array<SumpleteMark>(gridSize).fill("unknown")),
})

// Striking first: crossing numbers out is the move the puzzle is actually played with, and marking a
// number as kept is the optional confirmation on top.
const cycle = (mark: SumpleteMark): SumpleteMark =>
  mark === "unknown" ? "strike" : mark === "strike" ? "keep" : "unknown"

export const toggleSumpleteCell = produce((state: SumpleteState, row: number, col: number) => {
  state.cells[row][col] = cycle(state.cells[row][col])
})
