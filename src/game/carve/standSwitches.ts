import { hashString } from "@/support/hashString"
import { plainSwitchId } from "../cellSlot"
import { switchAddress } from "../seeds/boardIndex"
import type { RoomSpec } from "./state"
import { switchStem } from "./ids"
import { encounterStyle } from "./roomSpecs"
import { pass } from "./state"

/**
 * WHAT STANDS IN EACH JUNCTION A SWITCH FILLS. A switch is a fork AND its encounter: the room keeps
 * `roomType: "fork"` and gains the encounter's fields. Its board is dealt by its mechanism, never by the
 * junction's coordinate, which a re-carve moves.
 */
export const standSwitches = pass("standSwitches", ["forks"], ["switchRooms"], (prep, state) => {
  const { switches } = prep.config.config
  const { resolveEncounter, resolveBoardIndex, floorRef } = prep.input
  const switchRooms = new Map<string, Partial<RoomSpec>>()
  if (switches) {
    const family = resolveEncounter(switches.encounter, "puzzle")
    for (let n = 0; n < state.forks.switchesPlaced; n++)
      switchRooms.set(state.forks.reserved[n], {
        family: family.familyId,
        tags: family.tags,
        mechanismId: plainSwitchId(n),
        boardIndex:
          resolveBoardIndex?.(family.familyId, switchAddress(plainSwitchId(n))) ??
          hashString(`${switchStem(floorRef, n)}|${family.familyId}`),
        ...encounterStyle(prep.config),
      })
  }
  state.switchRooms = switchRooms
})
