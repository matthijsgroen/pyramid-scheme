/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useCallback, useRef } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ForkShape } from "@/game/forkShape"
import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"
import { isModEnabled } from "@/mods/registeredMods"
import { generateLightbeamSwitch, type LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
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
 * The room is only ever authored into a junction the assembler shut, so the fallbacks below are for a board
 * built outside one — the playtesting bench, a story — where there is no fork and nothing to face.
 */
export const buildSwitchBoard = (
  seed: number,
  ctx: { difficulty?: Difficulty; forkShape?: ForkShape; exits?: RoomCell["exits"] }
): LightbeamSwitchBoard => {
  const shape = ctx.forkShape ?? "adjacent"
  const board = generateLightbeamSwitch(seed, ctx.difficulty ?? LIGHTBEAM_SWITCH_META.minTier ?? "starter", shape)
  return rotateBoard(board, quarterTurnsToFace(shape, shutWaysOut(ctx.exits)) ?? 0)
}

const LightbeamSwitchComponent: FamilyPlugin<LightbeamSwitchBoard>["Component"] = ({
  puzzle,
  ctx,
  journeys,
  onSolved,
  onCancel,
}) => {
  const exits = ctx.exits
  const address = ctx.address
  const open = journeys.getOpenWaysOut(ctx.journeyId)
  const openWayOut = shutWaysOut(exits).find(way => {
    const id = wayOutId(exits, way)
    return id !== undefined && open.has(id)
  })

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
        journeys.shutWaysOut(address)
        return
      }
      const id = wayOutId(exits, way)
      if (id === undefined) return
      routed.current = way
      journeys.setOpenWayOut(address, id)
    },
    [exits, address, journeys]
  )

  return (
    <LightbeamSwitchPuzzle
      board={puzzle}
      exits={exits}
      openWayOut={openWayOut}
      onRoute={onRoute}
      onSolved={onSolved}
      onCancel={onCancel}
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
