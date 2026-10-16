import { freeWaysOut } from "./derive"
import { switchStem } from "./ids"
import { MAIN_SECTION_ADDRESS } from "./sections"
import { pass } from "./state"

/**
 * WHICH DOORS EACH RESERVED JUNCTION'S SWITCH WOULD SHUT, for every reserved junction whether or not a switch
 * ends up standing in it: the carve is checked with all of them shut as well as all of them open. Each free way
 * out becomes a door named by the switch's stem and the authoring address beyond it, so the board in the fork
 * can say which way it left open. Asked with the switch ground in place, as every reader after
 * `shutSwitchGround` asks it.
 */
export const nameSwitchWays = pass(
  "nameSwitchWays",
  ["forks", "switchDoors", "maze", "branches", "doors", "lay", "labels", "mainRooms", "chainRooms"],
  ["switchWays"],
  (prep, state) => {
    const waysOut = freeWaysOut(state, state.switchDoors)
    state.switchWays = state.forks.reserved.map((pk, n) =>
      waysOut(pk).map(({ dir, neighborKey }) => ({
        dir,
        cell: neighborKey,
        gateKeyId: `${switchStem(prep.input.floorRef, n)}:${state.labels.address.get(neighborKey) ?? MAIN_SECTION_ADDRESS}`,
      }))
    )
  }
)
