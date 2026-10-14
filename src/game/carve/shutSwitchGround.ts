import { freeWaysOut, keyOf, nodeExitsOf } from "./derive"
import { pass } from "./state"

/**
 * A SWITCH'S OWN DOORS ARE DOORS, and nothing authored them: settling the grid mints one per free way out of each
 * junction a switch fills. Which ground each shuts off is settled here, so the drop rule refuses a landing the
 * player would otherwise reach without ever solving the board. Nothing but the drop rule reads them, so a floor
 * authoring no drop is spared the walk.
 *
 * Behind a door means every way in passes through it — so it is what the way in stops reaching once that one
 * node is shut. The drops are not ways in: a drop that let another drop past a door would be the same bypass one
 * step removed. Each walk sees the doors the walks before it shut.
 */
export const shutSwitchGround = pass(
  "shutSwitchGround",
  ["forks", "maze", "branches", "doors", "lay", "labels", "mainRooms", "chainRooms"],
  ["switchDoors"],
  (prep, state) => {
    const { oneWays } = prep.config.config
    const { oneWayObstacles } = prep.obstacles
    const { reserved, switchesPlaced } = state.forks
    const switchDoors = new Map<string, Set<string>>()
    const exitsOf = nodeExitsOf(state, switchDoors)
    const waysOut = freeWaysOut(state, switchDoors)
    const entranceKey = keyOf(state.maze.entrance)
    for (let n = 0; ((oneWays ?? []).length > 0 || oneWayObstacles.length > 0) && n < switchesPlaced; n++)
      for (const { neighborKey } of waysOut(reserved[n])) {
        const reached = new Set<string>([entranceKey])
        const queue = [entranceKey]
        for (let at = 0; at < queue.length; at++)
          for (const { neighborKey: onward } of exitsOf(queue[at])) {
            if (onward === neighborKey || reached.has(onward)) continue
            reached.add(onward)
            queue.push(onward)
          }
        for (const cellKey of state.branches.used)
          if (!reached.has(cellKey))
            switchDoors.set(cellKey, (switchDoors.get(cellKey) ?? new Set()).add(`door ${neighborKey}`))
      }
    state.switchDoors = switchDoors
  }
)
