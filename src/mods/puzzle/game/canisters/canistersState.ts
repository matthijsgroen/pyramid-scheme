import { produce } from "immer"
import { applyMove, type CanistersPuzzle, type Move, type Volumes } from "./canisters"

// The board as the player leaves it, per docs/instructions/state-models.md.
export type CanistersState = {
  /** What each canister holds now. */
  volumes: Volumes
  /** Every pour made, oldest first — the move counter reads its length, undo reads its end. */
  poured: Move[]
  /** How many of the board's volumes have been measured, in order. */
  measured: number
  /**
   * The canister the player has picked up, waiting for somewhere to pour it.
   *
   * Pouring is the only move there is, and it needs two taps; this is the first of them.
   */
  held?: number
  /**
   * The last claim the player made, so the board can answer it.
   *
   * Numbered, because the answer is an ANIMATION: two wrong claims on the same canister have to shake it
   * twice, and without something that changes between them the second one is indistinguishable from the
   * first and plays nothing.
   */
  claimed?: { canister: number; right: boolean; count: number }
  /** How many claims have been made — the number above, and nothing else reads it. */
  claims: number
  /** What each earlier state held, oldest first — the undo stack. */
  past: { volumes: Volumes; measured: number }[]
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createCanistersState = (puzzle: CanistersPuzzle): CanistersState => ({
  volumes: [...puzzle.start],
  poured: [],
  measured: 0,
  claims: 0,
  past: [],
})

/**
 * The amount in a canister is never shown and never checked for the player (design doc §7): they work it
 * out and then SAY so. A board that lit up the moment the right amount appeared would let a player pour at
 * random and watch for it, which is the whole puzzle handed over.
 */
const holdsWanted = (puzzle: CanistersPuzzle, volumes: Volumes, measured: number, canister: number): boolean =>
  measured < puzzle.targets.length && volumes[canister] === puzzle.targets[measured]

const record = (state: CanistersState) => {
  state.past.push({ volumes: [...state.volumes], measured: state.measured })
  if (state.past.length > UNDO_LIMIT) state.past.shift()
}

/** Picks a canister up to pour, or puts it back down if it was already held. */
export const holdCanister = produce((state: CanistersState, canister: number) => {
  if (state.volumes[canister] === 0) return
  state.held = state.held === canister ? undefined : canister
})

/**
 * Pours what is held into another canister.
 *
 * **A pour that cannot be paid for does not happen.** The budget IS the puzzle (design doc §2), so once it
 * is spent the water stops moving and the board stands as it is — undo gives a move back, reset gives them
 * all. Claiming is deliberately still allowed: the budget counts pours, so the last one of a line leaves
 * nothing in hand, and a board whose final claim were refused could never be finished at all.
 */
export const pourInto = produce((state: CanistersState, puzzle: CanistersPuzzle, to: number) => {
  const from = state.held
  if (from === undefined || from === to) return
  if (movesLeft(puzzle, state) <= 0) {
    state.held = undefined
    return
  }
  const move: Move = { from, to }
  const next = applyMove(puzzle.capacities, state.volumes, move)
  if (next.every((amount, index) => amount === state.volumes[index])) {
    state.held = undefined
    return
  }
  record(state)
  state.volumes = next
  state.poured.push(move)
  state.held = undefined
})

/**
 * The player says a canister holds the volume that was asked for.
 *
 * **A wrong claim costs a move**, which is what makes the claim worth thinking about: with the amounts
 * unwritten, a free claim would be a tap to check after every pour.
 */
export const claimCanister = produce((state: CanistersState, puzzle: CanistersPuzzle, canister: number) => {
  record(state)
  state.claims++
  if (holdsWanted(puzzle, state.volumes, state.measured, canister)) {
    state.measured++
    state.claimed = { canister, right: true, count: state.claims }
    return
  }
  state.poured.push({ from: canister, to: canister })
  state.claimed = { canister, right: false, count: state.claims }
})

/**
 * Takes back the last move, and the move it cost.
 *
 * The budget is the puzzle, so undo has to give the move back or a player is punished twice for one
 * mistake — once by the wrong pour and once by a board they can no longer finish.
 */
export const undoPour = produce((state: CanistersState) => {
  const previous = state.past.pop()
  if (previous === undefined) return
  state.volumes = previous.volumes
  state.measured = previous.measured
  state.poured.pop()
  state.held = undefined
  state.claimed = undefined
})

export const isCanistersSolved = (puzzle: CanistersPuzzle, state: CanistersState): boolean =>
  state.measured >= puzzle.targets.length

/** Moves left before the board can no longer be finished inside its budget. */
export const movesLeft = (puzzle: CanistersPuzzle, state: CanistersState): number => puzzle.budget - state.poured.length
