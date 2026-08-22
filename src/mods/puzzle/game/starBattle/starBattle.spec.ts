import { describe, expect, it } from "vitest"
import {
  canUndoStarBattle,
  createStarBattleState,
  cycleStarBattleCell,
  firstStarBattleMistake,
  neighboursOf,
  ruledOutByStars,
  starBattleConflicts,
  starBattleSolved,
  sweepStarBattleCells,
  undoStarBattle,
  type CellMark,
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

const withStars = (cells: number[]): { marks: (CellMark | undefined)[] } => ({
  marks: Array.from({ length: 16 }, (_unused, cell) => (cells.includes(cell) ? "star" : undefined)),
})

describe("starBattle", () => {
  it("rules out the eight squares around a cell, and stops at the edges", () => {
    expect(neighboursOf(4, 5).sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
    expect(neighboursOf(4, 0).sort((a, b) => a - b)).toEqual([1, 4, 5])
  })

  // Elimination first, because elimination is what a player spends a board doing.
  it("cycles a square empty → dark → star → empty", () => {
    let state = createStarBattleState(board)
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBe("dark")
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBe("star")
    state = cycleStarBattleCell(state, 0)
    expect(state.marks[0]).toBeUndefined()
  })

  it("steps back one tap at a time, and stops at the opening board", () => {
    let state = createStarBattleState(board)
    state = cycleStarBattleCell(state, 0)
    state = cycleStarBattleCell(state, 5)
    state = undoStarBattle(state)
    expect(state.marks[5]).toBeUndefined()
    expect(state.marks[0]).toBe("dark")
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

  it("shows what a star rules out, without writing anything there", () => {
    const spent = ruledOutByStars(board, withStars([5]).marks)
    // The eight neighbours of square 5, and not square 5 itself: a star does not rule out its own square.
    expect([...spent].sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
    // Nothing is written, so the marks are still only what the player put there.
    expect(withStars([5]).marks.filter(Boolean).length).toBe(1)
    // A square the player has already marked is theirs, not the rule's to redraw.
    const marks = withStars([5]).marks.slice()
    marks[0] = "dark"
    expect(ruledOutByStars(board, marks).has(0)).toBe(false)
    // Take the star away and its neighbourhood comes straight back.
    expect(ruledOutByStars(board, createStarBattleState(board).marks).size).toBe(0)
  })

  describe("a run ruled out in one move", () => {
    it("rules out the empty squares and one press takes the whole run back", () => {
      const swept = sweepStarBattleCells(createStarBattleState(board), [0, 1, 2])
      expect(swept.marks.slice(0, 3)).toEqual(["dark", "dark", "dark"])
      // One entry, not three: a run darkened on a wrong reading is what undo is for.
      expect(undoStarBattle(swept).marks.slice(0, 3)).toEqual([undefined, undefined, undefined])
    })

    it("leaves every square that already carries a mark", () => {
      let state = createStarBattleState(board)
      state = cycleStarBattleCell(state, 1) // dark
      state = cycleStarBattleCell(state, 2)
      state = cycleStarBattleCell(state, 2) // star
      const swept = sweepStarBattleCells(state, [0, 1, 2])
      // A sweep can never take a star back, which is what makes it safe to aim broadly.
      expect(swept.marks.slice(0, 3)).toEqual(["dark", "dark", "star"])
    })

    it("is not a move at all when there is nothing left to rule out", () => {
      const state = sweepStarBattleCells(createStarBattleState(board), [0])
      expect(sweepStarBattleCells(state, [0])).toBe(state)
    })
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
