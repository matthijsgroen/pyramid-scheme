import { hashString } from "@/support/hashString"
import { holeOf } from "../lockAuthoring"
import { edgeAllowed, keyOf, rooms } from "./derive"
import { CONNECTOR_DIRS } from "./grid"
import { pass } from "./state"

/**
 * A PIPE'S HOLE STANDS IN THE BACK WALL OF A BARE NODE OF ITS REGION: a corridor node whose north side is a wall,
 * neither the entrance, the exit, a junction nor a node a way into another region leaves from, and off the main
 * path where the region has one. Nodes are ranked by hash, as plates are, so the pass draws nothing and a floor
 * without a pipe is untouched. Two holes never share a node. A region with no such node fails the attempt.
 */
export const placePipeHoles = pass(
  "placePipeHoles",
  [
    "maze",
    "branches",
    "doors",
    "lay",
    "labels",
    "drops",
    "forks",
    "switchDoors",
    "switchWays",
    "switchRooms",
    "forkSwitchRooms",
    "mainRooms",
    "chainRooms",
  ],
  ["pipeHoles"],
  (prep, state) => {
    const holes = prep.mechanisms.weights.flatMap(control =>
      (control.pipes ?? []).flatMap(pipe => pipe.ends.map(region => ({ id: holeOf(pipe.id, region), region })))
    )
    const pipeHoles = new Map<string, { cell: string }>()
    state.pipeHoles = pipeHoles
    if (holes.length === 0) return

    const { siteId } = prep.input
    const { n: N, entrance, exit, mainPath } = state.maze
    const { used } = state.branches
    const allowed = edgeAllowed(state, state.switchDoors)
    const onMainPath = new Set(mainPath.map(keyOf))
    const taken = new Set<string>([
      keyOf(entrance),
      keyOf(exit),
      ...rooms(state).keys(),
      ...state.forks.reserved,
      ...state.switchRooms.keys(),
      ...state.forkSwitchRooms.keys(),
      ...state.switchWays.flatMap(ways => ways.map(({ cell }) => cell)),
      ...state.drops.flatMap(drop => [drop.from, drop.to]),
    ])

    // A node's ways out as the renderer will write them: to a used neighbour, over an allowed edge.
    const waysOut = (key: string) => {
      const [r, c] = key.split(",").map(Number)
      return CONNECTOR_DIRS.flatMap(([dr, dc, dir]) => {
        const [nr, nc] = [r + dr, c + dc]
        const there = `${nr},${nc}`
        return nr >= 0 && nr < N && nc >= 0 && nc < N && used.has(there) && allowed(r, c, nr, nc)
          ? [{ dir, there }]
          : []
      })
    }
    const backWalled = (key: string, region: string) => {
      const [r, c] = key.split(",").map(Number)
      if (r % 2 !== 0 || c % 2 !== 0 || taken.has(key) || state.labels.hidden.has(key)) return false
      if (state.labels.region.get(key) !== region) return false
      const ways = waysOut(key)
      return (
        ways.length <= 2 &&
        ways.every(({ dir }) => dir !== "n") &&
        ways.every(({ there }) => state.labels.region.get(there) === region)
      )
    }

    for (const { id, region } of holes) {
      const rank = (key: string) => hashString(`${siteId}|hole|${id}|${key}`)
      const [best] = [...used]
        .filter(key => backWalled(key, region))
        .sort(
          (a, b) => Number(onMainPath.has(a)) - Number(onMainPath.has(b)) || rank(a) - rank(b) || a.localeCompare(b)
        )
      if (best === undefined) return { retry: [{ type: "pipeHoleNotPlaced", hole: id }] }
      taken.add(best)
      pipeHoles.set(id, { cell: best })
    }
  }
)
