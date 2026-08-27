import { describe, expect, it } from "vitest"
import type { CanistersPuzzle } from "./canisters"
import {
  claimCanister,
  createCanistersState,
  holdCanister,
  isCanistersSolved,
  movesLeft,
  pourInto,
  tapCanister,
  undoPour,
} from "./canistersState"

const board: CanistersPuzzle = { capacities: [3, 5], targets: [4], budget: 6 }
const twoLegs: CanistersPuzzle = { capacities: [3, 5], targets: [4, 2], budget: 9 }

describe("pouring a board", () => {
  it("fills, holds and pours, and counts each as one move", () => {
    let state = createCanistersState()
    state = tapCanister(state, board, 1, "fill")
    expect(state.volumes).toEqual([0, 5])
    state = holdCanister(state, 1)
    expect(state.held).toBe(1)
    state = pourInto(state, board, 0)
    expect(state.volumes).toEqual([3, 2])
    expect(state.poured).toHaveLength(2)
    expect(movesLeft(board, state)).toBe(4)
  })

  it("puts a held canister back down when it is tapped again", () => {
    let state = tapCanister(createCanistersState(), board, 1, "fill")
    state = holdCanister(state, 1)
    state = holdCanister(state, 1)
    expect(state.held).toBeUndefined()
  })

  it("spends no move on a pour that could not move anything", () => {
    // Pouring an empty canister is not a move the player made, so it must not cost them one.
    let state = createCanistersState()
    state = tapCanister(state, board, 0, "empty")
    expect(state.poured).toHaveLength(0)
  })
})

describe("claiming a volume", () => {
  /**
   * The level is never a number on this board (design doc §7), so the game must not confirm it either: a
   * vessel that lit up the moment it held the right amount would let a player pour at random and watch for
   * it. The player works it out and says so.
   */
  it("is not solved by the right amount appearing — it has to be claimed", () => {
    let state = createCanistersState()
    state = tapCanister(state, board, 1, "fill")
    state = holdCanister(state, 1)
    state = pourInto(state, board, 0)
    state = tapCanister(state, board, 0, "empty")
    state = holdCanister(state, 1)
    state = pourInto(state, board, 0)
    state = tapCanister(state, board, 1, "fill")
    state = holdCanister(state, 1)
    state = pourInto(state, board, 0)
    expect(state.volumes).toContain(4)
    expect(isCanistersSolved(board, state)).toBe(false)
    state = claimCanister(state, board, 1)
    expect(state.claimed).toEqual({ canister: 1, right: true })
    expect(isCanistersSolved(board, state)).toBe(true)
  })

  it("costs a move to claim the wrong one, so guessing is not free", () => {
    // With the levels unreadable, a free claim would be two taps to check after every pour.
    let state = tapCanister(createCanistersState(), board, 1, "fill")
    const before = movesLeft(board, state)
    state = claimCanister(state, board, 1)
    expect(state.claimed).toEqual({ canister: 1, right: false })
    expect(state.measured).toBe(0)
    expect(movesLeft(board, state)).toBe(before - 1)
  })

  it("claims legs in order, so a later volume claimed early is refused", () => {
    // This board wants 4 then 2. The 2 is standing there after one pour, and is not the leg being asked.
    let state = createCanistersState()
    state = tapCanister(state, twoLegs, 1, "fill")
    state = holdCanister(state, 1)
    state = pourInto(state, twoLegs, 0)
    expect(state.volumes).toEqual([3, 2])
    state = claimCanister(state, twoLegs, 1)
    expect(state.claimed?.right).toBe(false)
    expect(state.measured).toBe(0)
  })
})

describe("undo", () => {
  it("gives the move back, because the budget is the puzzle", () => {
    // Punishing a mistake twice — once by the wrong pour and once by a board that can no longer be
    // finished — would make the undo button a trap.
    let state = tapCanister(createCanistersState(), board, 1, "fill")
    expect(movesLeft(board, state)).toBe(5)
    state = undoPour(state)
    expect(state.volumes).toEqual([0, 0])
    expect(movesLeft(board, state)).toBe(6)
  })

  it("takes a claimed leg back with the claim that made it", () => {
    let state = createCanistersState()
    state = tapCanister(state, twoLegs, 1, "fill")
    state = holdCanister(state, 1)
    state = pourInto(state, twoLegs, 0)
    state = tapCanister(state, twoLegs, 0, "empty")
    state = holdCanister(state, 1)
    state = pourInto(state, twoLegs, 0)
    state = tapCanister(state, twoLegs, 1, "fill")
    state = holdCanister(state, 1)
    state = pourInto(state, twoLegs, 0)
    state = claimCanister(state, twoLegs, 1)
    expect(state.measured).toBe(1)
    state = undoPour(state)
    expect(state.measured).toBe(0)
    expect(state.claimed).toBeUndefined()
  })

  it("does nothing on an untouched board", () => {
    const state = undoPour(createCanistersState())
    expect(state.volumes).toEqual([0, 0])
    expect(state.poured).toHaveLength(0)
  })
})
