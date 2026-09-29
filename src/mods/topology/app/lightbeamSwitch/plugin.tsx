/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useCallback, useRef } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { MECHANISM_AT_REST } from "@/app/state/useJourneys"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ForkShape } from "@/game/forkShape"
import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"
import { isModEnabled } from "@/mods/registeredMods"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import type { MirrorAngle } from "@/mods/core/game/beam/physics"
import { DEFAULT_FORK_SHAPE, type LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { decodeLightbeamAngles, encodeLightbeamAngles } from "../../game/lightbeamSwitch/lightbeamSwitchState"
import { LIGHTBEAM_SWITCH_META } from "../../game/lightbeamSwitch/meta"
import { quarterTurnsToFace, rotateBoard } from "../../game/lightbeamSwitch/rotateBoard"
import { shutWaysOut, wayOutId } from "../../game/lightbeamSwitch/waysOut"
import { LightbeamSwitchPuzzle } from "./LightbeamSwitchPuzzle"

/**
 * The board this room stands on: built for the SHAPE of the fork, then laid down facing the fork's real
 * ways out.
 *
 * The turn is the last step and never part of the build. A board is generated per (shape, tier, seed), so
 * the four compass layouts of one shape are one board turned four ways rather than four boards — which is
 * what lets a seed list hold one entry per shape instead of one per bearing.
 *
 * `seed` reaches `generatePuzzle` as the index into that shape and tier's list, and as the seed to search
 * from where no list covers them — the dev journey's expert, master and wizard switches, the playtesting
 * bench, a story.
 *
 * The room is only ever authored into a junction the assembler shut, so the fallback shape below is for a
 * board built outside one, where there is no fork and nothing to face.
 */
export const buildSwitchBoard = (
  seed: number,
  ctx: { difficulty?: Difficulty; forkShape?: ForkShape; exits?: RoomCell["exits"] }
): LightbeamSwitchBoard => {
  const shape = ctx.forkShape ?? DEFAULT_FORK_SHAPE
  const board = generatePuzzle<LightbeamSwitchBoard>(LIGHTBEAM_SWITCH_META, seed, {
    difficulty: ctx.difficulty,
    forkShape: shape,
  })
  return rotateBoard(board, quarterTurnsToFace(shape, shutWaysOut(ctx.exits)) ?? 0)
}

/**
 * Where this room's own mirrors are filed — distinct from `address` itself, whose value
 * `mechanismDoors.ts` reads as the fork's actual GATE STATE (a gateKeyId string or
 * `MECHANISM_AT_REST`). A cosmetic record of the angles the player left the board at must never collide
 * with the one thing on this key that really has to stay exactly that string.
 */
const anglesAddress = (address: string): string => `${address}:angles`

const LightbeamSwitchComponent: FamilyPlugin<LightbeamSwitchBoard>["Component"] = ({
  puzzle,
  ctx,
  journeys,
  onSolved,
}) => {
  const exits = ctx.exits
  const address = ctx.address
  const mechanismStates = journeys.getMechanismStates(ctx.journeyId)
  const state = mechanismStates.get(address)
  const openWayOut = shutWaysOut(exits).find(way => wayOutId(exits, way) === state)
  const savedAnglesRaw = mechanismStates.get(anglesAddress(address))
  const savedAngles = savedAnglesRaw ? decodeLightbeamAngles(savedAnglesRaw) : undefined

  // What this visit has already told the floor. The board is re-rendered on every tap and reports where
  // the light stands each time; without this the same answer would be written again and again, and each
  // write re-renders the screen that is asking.
  const routed = useRef<WayOut | undefined>(openWayOut)
  const onRoute = useCallback(
    (way: WayOut | undefined) => {
      if (routed.current === way) return
      // The light reaching no shrine decides nothing, so the fork stands as the assembler left it.
      if (way === undefined) {
        routed.current = undefined
        journeys.setMechanismState(address, MECHANISM_AT_REST)
        return
      }
      const id = wayOutId(exits, way)
      if (id === undefined) return
      routed.current = way
      journeys.setMechanismState(address, id)
    },
    [exits, address, journeys]
  )

  // The mirrors themselves, kept apart from the gate state above so a visit to any other room in between
  // never costs the player the arrangement they left, whatever door it happens to have opened. Guarded
  // the same way `onRoute` is: without it, a save whose own identity changes on every write (as this
  // one's does) re-fires this effect on every render it causes, forever.
  const writtenAngles = useRef<string | undefined>(savedAnglesRaw)
  const onAngles = useCallback(
    (angles: readonly MirrorAngle[]) => {
      const encoded = encodeLightbeamAngles(angles)
      if (writtenAngles.current === encoded) return
      writtenAngles.current = encoded
      journeys.setMechanismState(anglesAddress(address), encoded)
    },
    [address, journeys]
  )

  return (
    <LightbeamSwitchPuzzle
      board={puzzle}
      exits={exits}
      openWayOut={openWayOut}
      savedAngles={savedAngles}
      onRoute={onRoute}
      onAngles={onAngles}
      onSolved={onSolved}
    />
  )
}

if (isModEnabled("topology")) {
  registerFamily({
    meta: LIGHTBEAM_SWITCH_META,
    // Seeded from the room's BOARD INDEX, which the assembler hashes from the switch's authoring address
    // — the seed core offers is hashed from the cell's coordinate, and the next carve moves that while the
    // save slot holding the fork's configuration stays put.
    generate: (seed, ctx): LightbeamSwitchBoard => buildSwitchBoard(ctx.boardIndex ?? seed, ctx),
    Component: LightbeamSwitchComponent,
  })
}
