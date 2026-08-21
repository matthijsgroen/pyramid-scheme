import { describe, expect, it } from "vitest"
import {
  canUndoStarBattle,
  createStarBattleState,
  cycleStarBattleCell,
  firstStarBattleMistake,
  neighboursOf,
  starBattleConflicts,
  starBattleSolved,
  undoStarBattle,
  type StarBattlePuzzle,
} from "./starBattle"

/**
 * A 4×4 board with four regions in horizontal bands, and the answer that goes with it.
 *
 * Small enough to read: the star of band `n` sits at column `(n * 2 + 1) % 4`, which keeps one to a column
 * and no two touching.
 */
const board: StarBattlePuzzle = {
  size: 4,
  quota: 1,
  regions: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
}
const answer = [1, 7, 8, 14]

const withStars = (cells: number[]) => ({
  marks: Array.from({ length: 16 }, (_unused, cell) => (cells.includes(cell) ? ("star" as const) : undefined)),
})

describe("starBattle", () => {
  it("rules out the eight squares around a cell, and stops at the edges", () => {
    expect(neighboursOf(4, 5).sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
    expect(neighboursOf(4, 0).sort((a, b) => a - b)).toEqual([1, 4, 5])
  })

  it("cycles a square empty → star → dark → empty", () => {
    let state = createStarBattleState(board)
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBe("star")
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBe("dark")
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBeUndefined()
  })

  it("steps back one tap at a time, and stops at the opening board", () => {
    let state = createStarBattleState(board)
    state = cycleStarBattleCell(state, 0)
    state = cycleStarBattleCell(state, 5)
    state = undoStarBattle(state)
    expect(state.marks[5]).toBeUndefined()
    expect(state.marks[0]).toBe("star")
    state = undoStarBattle(undoStarBattle(state))
    expect(canUndoStarBattle(state)).toBe(false)
  })

  it("is solved when every group holds its star and none of them touch", () => {
    expect(starBattleSolved(board, withStars(answer))).toBe(true)
    // Dark marks are the player's own bookkeeping, so a board solved without any of them is still solved,
    // and one covered in them is no less solved.
    const withDark = {
      marks: withStars(answer).marks.map(mark => mark ?? ("dark" as const)),
    }
    expect(starBattleSolved(board, withDark)).toBe(true)
  })

  it("is not solved while a group is short of its star", () => {
    expect(starBattleSolved(board, withStars(answer.slice(1)))).toBe(false)
  })

  it("reds a touching pair, and the stars of an overfilled group", () => {
    // 1 and 4 touch diagonally.
    expect([...starBattleConflicts(board, withStars([1, 4]))].sort((a, b) => a - b)).toEqual([1, 4])
    // Two stars in region 0, which owes one.
    expect([...starBattleConflicts(board, withStars([0, 2]))].sort((a, b) => a - b)).toEqual([0, 2])
    // An unfinished board is not a broken one.
    expect(starBattleConflicts(board, withStars([1])).size).toBe(0)
  })

  it("reports a wrong dark mark as well as a wrong star", () => {
    const solution = Array.from({ length: 16 }, (_unused, cell) => answer.includes(cell))
    expect(firstStarBattleMistake(withStars(answer).marks, solution)).toBeUndefined()
    expect(firstStarBattleMistake(withStars([0]).marks, solution)).toBe(0)
    // Darkening the square the answer needs stalls the board just as thoroughly as a misplaced star.
    const darkened = createStarBattleState(board).marks.map((_unused, cell) =>
      cell === 1 ? ("dark" as const) : undefined
    )
    expect(firstStarBattleMistake(darkened, solution)).toBe(1)
  })
})
