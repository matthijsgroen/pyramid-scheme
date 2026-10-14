import { hashString } from "@/support/hashString"
import { corridorIndexOf } from "../obstacles"
import { switchAddress } from "../seeds/boardIndex"
import { MECHANISM_AT_REST } from "../siteTypes"
import type { Direction } from "../siteTypes"
import { keyOf, nodeExitsOf, rooms } from "./derive"
import { gateKeyOf, gatesOwnedBy } from "./ids"
import { encounterStyle } from "./roomSpecs"
import { pass } from "./state"
import type { ForkSwitchRoom } from "./state"

/**
 * A FORK-SWITCH IS THE JUNCTION A `{ in }` FORK LAID, with its encounter standing in it. Only the seams are its
 * doors — the gates its `owners` put on the first cell of each arm — and its states follow from them. A gate
 * not standing on its arm's seam is a mistake in the carve, so it throws.
 */
export const standForkSwitches = pass(
  "standForkSwitches",
  ["maze", "junctions", "lay", "keys", "branches", "doors", "switchDoors", "mainRooms", "chainRooms"],
  ["forkSwitchRooms"],
  (prep, state) => {
    const { floorRef, resolveEncounter, resolveBoardIndex } = prep.input
    const { authored } = prep.config
    const { forkIns } = prep.forks
    const { mainPath } = state.maze
    const laid = state.lay?.laid
    const exitsOf = nodeExitsOf(state, state.switchDoors)
    const roomAt = rooms(state)
    const forkSwitchRooms = new Map<string, ForkSwitchRoom>()
    for (const control of prep.mechanisms.forkSwitches) {
      const k = forkIns.findIndex(fork => fork.region === control.in)
      const fork = forkIns[k]
      const junctionKey = keyOf(mainPath[state.junctions.order[k]])
      const dirOfWay = new Map(exitsOf(junctionKey).map(({ dir, neighborKey }) => [neighborKey, dir]))
      const gateKeyByDir = new Map<Direction, string>()
      fork.seams.forEach(([from, to], j) => {
        const wayKey = laid
          ? laid.junctions[k].arms.find(
              arm => (arm.seam[0] === from && arm.seam[1] === to) || (arm.seam[0] === to && arm.seam[1] === from)
            )!.first
          : keyOf(
              state.keys.chains.find(chain => chain.parentIdx === undefined && chain.idx === fork.sectionIdxs[j])!
                .cells[0]
            )
        // A step in the board's region stands its tile as the arm's first room, so the door is the node beyond it.
        const steps = laid?.thresholds.has(wayKey)
          ? exitsOf(wayKey).filter(({ neighborKey }) => neighborKey !== junctionKey)
          : []
        const doorKey = steps.length === 1 ? steps[0].neighborKey : wayKey
        // The seam's own corridor: a layout corridor on this pair, never a falling one beside it.
        const onSeam = ([a, b]: readonly [string, string]) => (a === from && b === to) || (a === to && b === from)
        const gate = gatesOwnedBy(authored, control.id).find(
          gate =>
            onSeam(gate.at.between) &&
            prep.layout.layoutCorridors.some(
              corridor =>
                onSeam(corridor.between) && corridor.index === corridorIndexOf(gate) && corridor.drop === undefined
            )
        )!
        if (roomAt.get(doorKey)?.requiredKeyId !== gateKeyOf(floorRef, gate.id))
          throw new Error(`[siteAssembler] gate ${gate.id} does not stand on the seam of ${control.id}'s arm`)
        gateKeyByDir.set(dirOfWay.get(wayKey)!, gateKeyOf(floorRef, gate.id))
      })
      const family = resolveEncounter(control.encounter, "puzzle")
      forkSwitchRooms.set(junctionKey, {
        room: {
          family: family.familyId,
          tags: family.tags,
          mechanismId: control.id,
          boardIndex:
            resolveBoardIndex?.(family.familyId, switchAddress(control.id)) ??
            hashString(`${gateKeyOf(floorRef, control.id)}|${family.familyId}`),
          mechanism: {
            states: [MECHANISM_AT_REST, ...gateKeyByDir.values()],
            initial: MECHANISM_AT_REST,
            returnsToInitial: true,
            positions: [...gateKeyByDir.values()].map(gateKeyId => ({ state: gateKeyId, gateKeyId })),
          },
          ...encounterStyle(prep.config),
        },
        gateKeyByDir,
      })
    }
    state.forkSwitchRooms = forkSwitchRooms
  }
)
