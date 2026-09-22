import { produce } from "immer"
import { BACKSLASH, SLASH, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { traceWitnessBeam, type WitnessBoard } from "./generateWitnessDoor"
import type { WitnessShrine } from "./witnessKeys"

/**
 * The player's answer, and the promise it is measured against: how every mirror lies, and which shrine
 * they said they were opening.
 *
 * The shrine is part of the state rather than a setting beside it because it is the move that matters —
 * the board has a route to both, so naming one is what turns a route into an answer.
 */
export type WitnessDoorState = {
  angles: MirrorAngle[]
  chosen?: WitnessShrine
}

export const createWitnessDoorState = (board: WitnessBoard): WitnessDoorState => ({
  angles: [...board.grid.initial],
})

/** A mirror lies one of two ways, so a tap is its own undo. */
export const turnWitnessMirror = produce((state: WitnessDoorState, mirror: number) => {
  state.angles[mirror] = state.angles[mirror] === SLASH ? BACKSLASH : SLASH
})

export const chooseWitnessShrine = produce((state: WitnessDoorState, shrine: WitnessShrine) => {
  state.chosen = shrine
})

/** Where the light ends up, which is the only question the board asks. */
export const litWitnessShrine = (board: WitnessBoard, state: WitnessDoorState): WitnessShrine | undefined =>
  traceWitnessBeam(board, state.angles).shrine

/**
 * Solved when the light reaches the shrine the door is named for — reaching the other one is a route, not
 * an answer.
 *
 * `named` is passed in rather than read off the state because a door outlives one board: the key it minted
 * says which shrine it was opened for long after the in-progress board has been dropped.
 */
export const isWitnessDoorSolved = (
  board: WitnessBoard,
  state: WitnessDoorState,
  named: WitnessShrine | undefined
): boolean => named !== undefined && litWitnessShrine(board, state) === named
