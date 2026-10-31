import { describe, expect, it } from "vitest"
import {
  blankMarks,
  createStarBattleState,
  cycleStarBattleCell,
  groupsOf,
  ruledOutByStars,
  sweepStarBattleCells,
  type StarBattlePuzzle,
} from "./starBattle"

const board: StarBattlePuzzle = {
  size: 5,
  quota: 1,
  walls: Array.from({ length: 25 }, (_unused, cell) => [2, 7, 12].includes(cell)),
}

describe("a star battle board with walls", () => {
  it("a tap on a wall changes nothing and adds no undo entry", () => {
    const state = createStarBattleState(board)
    expect(cycleStarBattleCell(state, 2, board)).toBe(state)
  })
  it("a sweep skips walls", () => {
    const next = sweepStarBattleCells(createStarBattleState(board), [1, 2, 3], board)
    expect(next.marks[2]).toBeUndefined()
    expect(next.marks[1]).toBe("dark")
  })
  it("a sweep over walls alone changes nothing", () => {
    const state = createStarBattleState(board)
    expect(sweepStarBattleCells(state, [2, 7], board)).toBe(state)
  })
  it("the solver starts with walls ruled out", () => {
    expect(blankMarks(board).filter(m => m === "dark")).toHaveLength(3)
  })
  it("a regionless board's groups are its rows and columns", () => {
    expect(groupsOf(board)).toHaveLength(10)
  })
  it("a star never rules out a wall", () => {
    const marks = blankMarks(board).map((mark, cell) => (cell === 6 ? ("star" as const) : mark))
    const spent = ruledOutByStars(board, marks)
    expect(spent.has(7)).toBe(false)
    expect(spent.has(5)).toBe(true)
  })
})
