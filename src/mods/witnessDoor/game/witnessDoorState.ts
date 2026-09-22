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

/** Solved when the light reaches the shrine the player named — reaching the other one is a route, not an answer. */
export const isWitnessDoorSolved = (board: WitnessBoard, state: WitnessDoorState): boolean =>
  state.chosen !== undefined && litWitnessShrine(board, state) === state.chosen
