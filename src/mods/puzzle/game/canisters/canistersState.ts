import { produce } from "immer"
import { applyMove, type CanistersPuzzle, type Move, type Volumes } from "./canisters"

// The board as the player leaves it, per docs/instructions/state-models.md.
export type CanistersState = {
  /** What each canister holds now. */
  volumes: Volumes
  /** Every move made, oldest first — the move counter reads its length, undo reads its end. */
  poured: Move[]
  /** How many of the board's volumes have been measured, in order. */
  measured: number
  /**
   * The canister the player has picked up, waiting for somewhere to pour it.
   *
   * A pour needs two taps and this is the first of them. Filling and emptying are one tap each, so only
   * pouring has a held state (design doc §6).
   */
  held?: 0 | 1
  /** The last claim the player made, so the board can say whether it was right. */
  claimed?: { canister: 0 | 1; right: boolean }
  /** Volumes each earlier state held, oldest first — the undo stack. */
  past: { volumes: Volumes; measured: number }[]
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createCanistersState = (): CanistersState => ({
  volumes: [0, 0],
  poured: [],
  measured: 0,
  past: [],
})

/**
 * The volume a canister holds is never shown and never checked for the player (design doc §7): they have
 * to work out what is in there and then SAY so. A board that lit up the moment the right amount appeared
 * would let a player pour at random and watch for it, which is the whole puzzle handed over.
 */
const holdsWanted = (puzzle: CanistersPuzzle, volumes: Volumes, measured: number, canister: 0 | 1): boolean =>
  measured < puzzle.targets.length && volumes[canister] === puzzle.targets[measured]

const record = (state: CanistersState) => {
  state.past.push({ volumes: [state.volumes[0], state.volumes[1]], measured: state.measured })
  if (state.past.length > UNDO_LIMIT) state.past.shift()
}

/** Fill or empty: one tap, no holding. */
export const tapCanister = produce(
  (state: CanistersState, puzzle: CanistersPuzzle, canister: 0 | 1, kind: "fill" | "empty") => {
    const move: Move = { kind, canister }
    const next = applyMove(puzzle.capacities, state.volumes, move)
    if (next[0] === state.volumes[0] && next[1] === state.volumes[1]) return
    record(state)
    state.volumes = next
    state.poured.push(move)
    state.held = undefined
  }
)

/** Picks a canister up to pour, or puts it back down if it was already held. */
export const holdCanister = produce((state: CanistersState, canister: 0 | 1) => {
  if (state.volumes[canister] === 0) return
  state.held = state.held === canister ? undefined : canister
})

/** Pours what is held into the other canister. */
export const pourInto = produce((state: CanistersState, puzzle: CanistersPuzzle, to: 0 | 1) => {
  const from = state.held
  if (from === undefined || from === to) return
  const move: Move = { kind: "pour", from, to }
  const next = applyMove(puzzle.capacities, state.volumes, move)
  if (next[0] === state.volumes[0] && next[1] === state.volumes[1]) {
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
 * **A wrong claim costs a move**, which is what makes the claim worth thinking about: with the levels
 * unreadable, a free guess would be two taps to check every pour. It is the budget doing the same job it
 * does for the opening.
 */
export const claimCanister = produce((state: CanistersState, puzzle: CanistersPuzzle, canister: 0 | 1) => {
  record(state)
  if (holdsWanted(puzzle, state.volumes, state.measured, canister)) {
    state.measured++
    state.claimed = { canister, right: true }
    return
  }
  state.poured.push({ kind: "empty", canister })
  state.claimed = { canister, right: false }
})

/**
 * Takes back the last move, and the move it cost.
 *
 * The budget is the puzzle, so undo has to give the move back or the player is punished twice for one
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
