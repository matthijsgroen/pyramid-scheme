import { describe, expect, it } from "vitest"
import {
  createRushHourState,
  legalRange,
  neighbours,
  occupancy,
  rushHourSolved,
  slidePiece,
  WALL,
  type RushHourPuzzle,
} from "./rushHour"

/**
 * A hand-built 6×6, small enough to reason about in the head:
 *
 * ```
 *  . . V . . .
 *  P P V . . .   ← the player's lane, and the way out is the east end of it
 *  . . . . . .
 *  . . . H H .
 *  . . . . . .
 *  . . . . . .
 * ```
 */
const board: RushHourPuzzle = {
  size: 6,
  pieces: [
    { lane: 1, offset: 0, len: 2, horizontal: true }, // the player
    { lane: 2, offset: 0, len: 2, horizontal: false }, // across the player's lane
    { lane: 3, offset: 3, len: 2, horizontal: true }, // out of the way
  ],
}

describe("the blockade", () => {
  it("slides a piece along its lane and stops it where something is in the way", () => {
    const state = createRushHourState(board)
    // The player owns columns 0–1 and column 2 is taken by the vertical piece, so it cannot move at all.
    expect(legalRange(board, state, 0)).toEqual([0, 0])
    expect(slidePiece(board, state, 0, 4)).toBe(state)

    // The vertical piece may drop as far as row 4 — its own two cells and nothing below them.
    expect(legalRange(board, state, 1)).toEqual([0, 4])
    const moved = slidePiece(board, state, 1, 9)
    expect(moved.offsets[1]).toBe(4)
  })

  it("counts a piece's own cells as free, so a piece is never in its own way", () => {
    const state = createRushHourState(board)
    const grid = occupancy(board, state)
    expect(grid[1 * 6 + 0]).toBe(0)
    expect(grid[1 * 6 + 2]).toBe(1)
    expect(grid[0]).toBe(-1)
  })

  it("is solved when the player's piece has its nose on the east edge, and not before", () => {
    const state = createRushHourState(board)
    expect(rushHourSolved(board, state)).toBe(false)
    const cleared = slidePiece(board, state, 1, 3)
    const out = slidePiece(board, cleared, 0, 4)
    expect(out.offsets[0]).toBe(4)
    expect(rushHourSolved(board, out)).toBe(true)
  })

  it("lets nothing stand on a walled cell, and nothing shove one aside", () => {
    // A wall two cells right of the player, in its own lane's row — placed here only to prove the rule; the
    // generator never puts one in that lane, since it could never be got out of the way.
    const walled = { ...board, walls: [1 * 6 + 3] }
    const state = createRushHourState(walled)
    expect(occupancy(walled, state)[1 * 6 + 3]).toBe(WALL)
    // The vertical piece drops out of the way, and the player still stops in front of the wall.
    const cleared = slidePiece(walled, state, 1, 3)
    expect(slidePiece(walled, cleared, 0, 4).offsets[0]).toBe(1)
    expect(rushHourSolved(walled, slidePiece(walled, cleared, 0, 4))).toBe(false)
  })

  it("offers every legal move as a neighbour, and never the position it is already in", () => {
    const state = createRushHourState(board)
    const moves = neighbours(board, state)
    expect(moves.every(move => move.state.offsets[move.index] !== state.offsets[move.index])).toBe(true)
    // The player is pinned, so nothing is offered for it.
    expect(moves.some(move => move.index === 0)).toBe(false)
    // The vertical piece has four other offsets; the horizontal one has three columns to its left and one
    // to its right.
    expect(moves.filter(move => move.index === 1)).toHaveLength(4)
    expect(moves.filter(move => move.index === 2)).toHaveLength(4)
  })
})
