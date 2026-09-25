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

export const createLightbeamSwitchState = (board: LightbeamSwitchBoard): LightbeamSwitchState => ({
  angles: [...board.grid.initial],
})

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
