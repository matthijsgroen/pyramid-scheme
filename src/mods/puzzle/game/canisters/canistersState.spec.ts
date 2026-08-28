import { describe, expect, it } from "vitest"
import type { CanistersPuzzle } from "./canisters"
import {
  claimCanister,
  createCanistersState,
  holdCanister,
  isCanistersSolved,
  movesLeft,
  pourInto,
  undoPour,
} from "./canistersState"

/** Tartaglia's board: eight full, a five and a three to work in, split into two fours. */
const board: CanistersPuzzle = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 7 }
const twoLegs: CanistersPuzzle = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4, 1], budget: 12 }

/** The seven pours that split the eight, as a player would tap them. */
const split = (puzzle: CanistersPuzzle) => {
  let state = createCanistersState(puzzle)
  for (const [from, to] of [
    [0, 1],
    [1, 2],
    [2, 0],
    [1, 2],
    [0, 1],
    [1, 2],
    [2, 0],
  ]) {
    state = holdCanister(state, from)
    state = pourInto(state, puzzle, to)
  }
  return state
}

describe("pouring a board", () => {
  it("starts with all the water in one canister and never makes more", () => {
    const state = createCanistersState(board)
    expect(state.volumes).toEqual([8, 0, 0])
    expect(split(board).volumes.reduce((sum, each) => sum + each, 0)).toBe(8)
  })

  it("holds a canister and pours it, counting one move", () => {
    let state = createCanistersState(board)
    state = holdCanister(state, 0)
    expect(state.held).toBe(0)
    state = pourInto(state, board, 1)
    expect(state.volumes).toEqual([3, 5, 0])
    expect(state.poured).toHaveLength(1)
    expect(movesLeft(board, state)).toBe(6)
  })

  it("puts a held canister back down when it is tapped again", () => {
    let state = holdCanister(createCanistersState(board), 0)
    state = holdCanister(state, 0)
    expect(state.held).toBeUndefined()
  })

  it("spends no move on a pour that could not move anything", () => {
    // An empty canister cannot be picked up, and a pour into a full one moves nothing.
    let state = createCanistersState(board)
    state = holdCanister(state, 1)
    expect(state.held).toBeUndefined()
    state = pourInto(state, board, 2)
    expect(state.poured).toHaveLength(0)
  })
})

describe("claiming a volume", () => {
  /**
   * The amount is never a number on this board (design doc §7), so the game must not confirm it either: a
   * canister that lit up the moment it held the right amount would let a player pour at random and watch
   * for it. The player works it out and says so.
   */
  it("is not solved by the right amount appearing — it has to be claimed", () => {
    let state = split(board)
    expect(state.volumes).toContain(4)
    expect(isCanistersSolved(board, state)).toBe(false)
    state = claimCanister(state, board, 0)
    expect(state.claimed).toEqual({ canister: 0, right: true })
    expect(isCanistersSolved(board, state)).toBe(true)
  })

  it("costs a move to claim the wrong one, so guessing is not free", () => {
    let state = holdCanister(createCanistersState(board), 0)
    state = pourInto(state, board, 1)
    const before = movesLeft(board, state)
    state = claimCanister(state, board, 1)
    expect(state.claimed).toEqual({ canister: 1, right: false })
    expect(state.measured).toBe(0)
    expect(movesLeft(board, state)).toBe(before - 1)
  })

  it("claims legs in order, so a later volume claimed early is refused", () => {
    // This board wants 4 then 1. The 5 is standing there after one pour, and neither is the leg asked for.
    let state = holdCanister(createCanistersState(twoLegs), 0)
    state = pourInto(state, twoLegs, 1)
    expect(state.volumes).toEqual([3, 5, 0])
    state = claimCanister(state, twoLegs, 1)
    expect(state.claimed?.right).toBe(false)
    expect(state.measured).toBe(0)
  })
})

describe("undo", () => {
  it("gives the move back, because the budget is the puzzle", () => {
    // Punishing a mistake twice — once by the wrong pour and once by a board that can no longer be
    // finished — would make the undo button a trap.
    let state = holdCanister(createCanistersState(board), 0)
    state = pourInto(state, board, 1)
    expect(movesLeft(board, state)).toBe(6)
    state = undoPour(state)
    expect(state.volumes).toEqual([8, 0, 0])
    expect(movesLeft(board, state)).toBe(7)
  })

  it("takes a claimed leg back with the claim that made it", () => {
    let state = claimCanister(split(twoLegs), twoLegs, 0)
    expect(state.measured).toBe(1)
    state = undoPour(state)
    expect(state.measured).toBe(0)
    expect(state.claimed).toBeUndefined()
  })

  it("does nothing on an untouched board", () => {
    const state = undoPour(createCanistersState(board))
    expect(state.volumes).toEqual([8, 0, 0])
    expect(state.poured).toHaveLength(0)
  })
})
