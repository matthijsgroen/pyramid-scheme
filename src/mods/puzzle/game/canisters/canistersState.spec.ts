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
   * The board says what each vessel holds, so what stops a player pouring at random and watching for the
   * number is the budget rather than the reading (§2): the line is the optimal one exactly, and a claim
   * costs a move like any other. Solving is still an act — the player says which vessel it is.
   */
  it("is not solved by the right amount appearing — it has to be claimed", () => {
    let state = split(board)
    expect(state.volumes).toContain(4)
    expect(isCanistersSolved(board, state)).toBe(false)
    state = claimCanister(state, board, 0)
    expect(state.claimed).toEqual({ canister: 0, right: true, count: 1 })
    expect(isCanistersSolved(board, state)).toBe(true)
  })

  it("costs a move to claim the wrong one, so guessing is not free", () => {
    let state = holdCanister(createCanistersState(board), 0)
    state = pourInto(state, board, 1)
    const before = movesLeft(board, state)
    state = claimCanister(state, board, 1)
    expect(state.claimed).toEqual({ canister: 1, right: false, count: 1 })
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

  it("numbers each claim, so the same wrong answer twice is answered twice", () => {
    // The board answers a claim with an animation, and two identical claims are told apart only by this.
    let state = holdCanister(createCanistersState(board), 0)
    state = pourInto(state, board, 1)
    state = claimCanister(state, board, 1)
    expect(state.claimed?.count).toBe(1)
    state = claimCanister(state, board, 1)
    expect(state.claimed?.count).toBe(2)
  })

  it("does nothing on an untouched board", () => {
    const state = undoPour(createCanistersState(board))
    expect(state.volumes).toEqual([8, 0, 0])
    expect(state.poured).toHaveLength(0)
  })
})

describe("running out of moves", () => {
  /** A board with one pour paid for, so the second has nothing to spend. */
  const tight: CanistersPuzzle = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 1 }

  it("stops the pouring, rather than letting the water keep moving on credit", () => {
    // The budget IS the puzzle (§2): a counter that reads nought while the board plays on is not a budget.
    let state = holdCanister(createCanistersState(tight), 0)
    state = pourInto(state, tight, 1)
    expect(movesLeft(tight, state)).toBe(0)
    const spent = state.volumes

    state = holdCanister(state, 1)
    state = pourInto(state, tight, 2)
    expect(state.volumes).toEqual(spent)
    expect(movesLeft(tight, state)).toBe(0)
  })

  it("still lets the volume be claimed once the last pour is paid for", () => {
    // The budget counts pours, so a solved line ends with nothing in hand — a board that refused the claim
    // there could never be finished at all.
    let state = split(board)
    expect(movesLeft(board, state)).toBe(0)
    state = claimCanister(state, board, 0)
    expect(isCanistersSolved(board, state)).toBe(true)
  })

  it("gives the move back on undo, so a spent budget is not a dead end", () => {
    let state = holdCanister(createCanistersState(tight), 0)
    state = pourInto(state, tight, 1)
    state = undoPour(state)
    expect(movesLeft(tight, state)).toBe(1)

    state = holdCanister(state, 0)
    state = pourInto(state, tight, 2)
    expect(state.volumes).toEqual([5, 0, 3])
  })
})
