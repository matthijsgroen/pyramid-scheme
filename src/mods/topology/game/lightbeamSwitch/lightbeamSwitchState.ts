import { produce } from "immer"
import type { Direction as WayOut } from "@/game/siteTypes"
import { BACKSLASH, SLASH, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { traceBeam } from "../shrineBeam/shrineBeam"
import type { LightbeamSwitchBoard } from "./generateLightbeamSwitch"

/**
 * The player's answer: how every mirror on the board lies.
 *
 * There is nothing beside it to name, because the routing IS the answer — the shrine the light lands on
 * is the way out that opens. A board with the light still running into stone has answered nothing.
 */
export type LightbeamSwitchState = { angles: MirrorAngle[] }

/**
 * Whether `state` is one this board could actually stand on: one angle per mirror it owns, and every
 * angle a real `\`` or `/` — never a count that only happens to match, nor a value `traceBeam` could not
 * turn into a direction. A board regenerated under the same room key between visits can leave a record
 * of the right length for the WRONG board; length alone cannot tell the two apart, so this is the proof
 * `createLightbeamSwitchState` and a stale restore both lean on rather than trusting either on its own.
 */
export const stateFitsBoard = (board: LightbeamSwitchBoard, state: LightbeamSwitchState): boolean =>
  state.angles.length === board.grid.mirrors.length &&
  state.angles.every(angle => angle === SLASH || angle === BACKSLASH)

/**
 * Opens on `savedAngles` — the player's own mirrors, read back from the durable per-room record
 * (plugin.tsx) — and falls back to the board's own initial angles for a board never turned, or a saved
 * record this board could not have produced (see `stateFitsBoard`).
 */
export const createLightbeamSwitchState = (
  board: LightbeamSwitchBoard,
  savedAngles?: readonly MirrorAngle[]
): LightbeamSwitchState => {
  const saved = savedAngles && { angles: [...savedAngles] }
  return saved && stateFitsBoard(board, saved) ? saved : { angles: [...board.grid.initial] }
}

/**
 * How the player's own angles are written to that record — one field per mirror, in board order, so a
 * save reopens on the exact arrangement they left rather than any arrangement that lights the same door.
 */
export const encodeLightbeamAngles = (angles: readonly MirrorAngle[]): string => angles.join(",")

/**
 * The inverse. Undefined for anything that doesn't parse as one `SLASH`-or-`BACKSLASH` token per entry —
 * every other number `Number` would happily parse is impossible for a real board, and feeding one to
 * `traceBeam` is what sends its trace off the grid (`stepCell` indexing a direction that was never 0-7).
 *
 * This is the whole of what a token can be wrong about without seeing a board at all; whether the COUNT
 * belongs to any particular one is `stateFitsBoard`'s question, not this function's.
 */
export const decodeLightbeamAngles = (encoded: string): MirrorAngle[] | undefined => {
  if (encoded === "") return undefined
  const angles = encoded.split(",").map(Number)
  return angles.every(angle => angle === SLASH || angle === BACKSLASH) ? angles : undefined
}

/** A mirror lies one of two ways, so a tap is its own undo. */
export const turnSwitchMirror = produce((state: LightbeamSwitchState, mirror: number) => {
  state.angles[mirror] = state.angles[mirror] === SLASH ? BACKSLASH : SLASH
})

/**
 * The way out the light is standing on, as the fork's own compass bearing — the board is turned to face
 * the room before it is played, so a shrine's bearing is the direction the door it opens lies in.
 */
export const litWayOut = (board: LightbeamSwitchBoard, state: LightbeamSwitchState): WayOut | undefined => {
  const walk = traceBeam(
    board.grid,
    board.shrines.map(shrine => shrine.at),
    state.angles
  )
  return walk.shrine === undefined ? undefined : board.shrines[walk.shrine].canonicalDir
}

/** Solved once the light rests in a shrine: that shrine's way out is the one the switch now leaves open. */
export const isLightbeamSwitchSolved = (board: LightbeamSwitchBoard, state: LightbeamSwitchState): boolean =>
  litWayOut(board, state) !== undefined
