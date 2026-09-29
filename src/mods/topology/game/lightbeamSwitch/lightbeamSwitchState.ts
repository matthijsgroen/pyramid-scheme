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
 * Opens on `savedAngles` — the player's own mirrors, read back from the durable per-room record
 * (plugin.tsx) — and falls back to the board's own initial angles for a board never turned, or a saved
 * count that no longer matches this board's own mirrors.
 */
export const createLightbeamSwitchState = (
  board: LightbeamSwitchBoard,
  savedAngles?: readonly MirrorAngle[]
): LightbeamSwitchState => ({
  angles: savedAngles && savedAngles.length === board.grid.mirrors.length ? [...savedAngles] : [...board.grid.initial],
})

/**
 * How the player's own angles are written to that record — one field per mirror, in board order, so a
 * save reopens on the exact arrangement they left rather than any arrangement that lights the same door.
 */
export const encodeLightbeamAngles = (angles: readonly MirrorAngle[]): string => angles.join(",")

/** The inverse. Undefined for anything that doesn't parse as one finite angle per mirror — a record
 * from a build this board's shape no longer matches falls back to the board's own initial angles rather
 * than seed a state a real tap could never have produced. */
export const decodeLightbeamAngles = (encoded: string): MirrorAngle[] | undefined => {
  if (encoded === "") return undefined
  const angles = encoded.split(",").map(Number)
  return angles.every(Number.isFinite) ? angles : undefined
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
