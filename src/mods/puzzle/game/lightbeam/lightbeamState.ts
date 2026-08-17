import { produce } from "immer"
import { pieceStateCount, type LightbeamPuzzleData } from "./beam"
import type { LightbeamPuzzle } from "./generateLightbeam"

/**
 * The whole of the player's answer: which state each movable piece is in.
 *
 * There is no undo stack here, and that is deliberate (design doc §7). A tap cycles a piece, and cycling
 * round again puts it back — the move is its own inverse, so nothing a tap does is unrecoverable. The
 * Futoshiki argument for undo was that a placement destroyed pencilled work elsewhere; nothing here
 * destroys anything.
 */
export type LightbeamState = {
  states: number[]
}

export const createLightbeamState = (puzzle: LightbeamPuzzle): LightbeamState => ({ states: [...puzzle.initial] })

export const cycleLightbeamPiece = produce((state: LightbeamState, puzzle: LightbeamPuzzleData, piece: number) => {
  const total = pieceStateCount(puzzle.movable[piece])
  state.states[piece] = (state.states[piece] + 1) % total
})

/** How many taps this piece is away from where it started — what a "you have been fiddling" hint reads. */
export const pieceMoved = (state: LightbeamState, puzzle: LightbeamPuzzle, piece: number): boolean =>
  state.states[piece] !== puzzle.initial[piece]
