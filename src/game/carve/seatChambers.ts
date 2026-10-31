import { hashString } from "@/support/hashString"
import type { ActivityId } from "../activities"
import type { Direction } from "../siteTypes"
import { absorbedCell, contentNow, gateAtCell, keyOf, nodeExitsOf, regionDoorAt, rooms } from "./derive"
import { NEAR_NODES } from "./grid"
import { MAIN_SECTION_ADDRESS } from "./sections"
import { pass } from "./state"
import type { Cell, RoomSpec, Shortfall } from "./state"

/** One stretch of a path between a puzzle and whatever stands next along it: the nodes a chamber may take. */
type Gap = readonly string[]

/** One side path's chambers as authored: its gaps in path order, the chamber after each puzzle, and all its nodes. */
type SidePath = { address: string; gaps: readonly Gap[]; after: Record<number, ActivityId | true>; nodes: Gap }

/** Where `count` chambers spread over `gaps` gaps want to stand, evenly, the middle of each share first. */
const spreadTargets = (count: number, gaps: number): number[] =>
  Array.from({ length: count }, (_, i) => Math.min(gaps - 1, Math.floor(((i + 0.5) * gaps) / count)))

/** A path's gaps: from each puzzle to the next, the last to the path's end; `from` is -1 for a puzzle not found. */
const gapsBetween = (nodes: readonly string[], at: readonly number[]): Gap[] =>
  at.map((from, k) => (from < 0 ? [] : nodes.slice(from + 1, k + 1 < at.length ? at[k + 1] : nodes.length - 1)))

/**
 * A PASS-THROUGH CHAMBER IS A FREE NODE OF A PATH WIDENED INTO A ROOM, in the gap after the puzzle it was authored
 * after (`chambersByIndex`), and as many more as `chambers` asks and the floor has room for: spread over the main
 * path's gaps between its puzzles first, then on its side paths' nodes outside any lock region. No puzzle moves: a
 * chamber takes only a node nothing stands on.
 *
 * Free is a corridor node with exactly two ways out that no pass seated anything on: no gate, control, lever, laid
 * door, threshold, drop, stair, fork, switch or pipe hole, and none of a lock region a mechanic will stand its seats
 * in. It runs after every pass that seats something on a node, so none of them has to know chambers exist.
 *
 * No chamber stands where its 3×3 meets another room that claims floor (a fork, a portal, a dead end, another
 * chamber): two claims would contest a diagonal. A chamber whose activity is left to the carve stands only where its section's pool
 * holds a prop, since a chamber is always dressed and a section authored with no props has nothing to dress it with.
 * A turn or a horizontal comes before a vertical, whose corridor
 * crosses the north row a prop stands against. Ties break by hash, never by `rand()`, so no other draw moves.
 * `chambers` is an intent, as `packing` is: a floor with room for fewer seats fewer and carves on. Only a
 * `chamberAfter` whose gap holds no free node refuses the attempt.
 */
export const seatChambers = pass(
  "seatChambers",
  [
    "maze",
    "content",
    "mainControls",
    "branches",
    "doors",
    "lay",
    "keys",
    "mainRooms",
    "chainRooms",
    "forks",
    "switchWays",
    "switchRooms",
    "forkSwitchRooms",
    "drops",
    "pipeHoles",
    "labels",
  ],
  ["chambers"],
  (prep, state) => {
    const { config, addressOf } = prep.config
    const { siteId } = prep.input
    const chambers = new Map<string, RoomSpec>()
    state.chambers = chambers

    const { mainPath } = state.maze
    const mainAfter = config.chambersByIndex ?? {}
    const mainTotal = Math.max(config.chambers ?? 0, Object.keys(mainAfter).length)
    const sides: SidePath[] = state.keys.chains
      .filter(chain => !chain.laid)
      .map(({ section, cells, positional }) => {
        const nodes = cells.map((cell: Cell) => keyOf(cell))
        const puzzleAt = (k: number) =>
          cells.findIndex(cell => {
            const spec = state.chainRooms.get(keyOf(cell))
            return spec?.roomType === "encounter" && spec.family !== undefined && spec.pathIndex === k
          })
        return {
          address: addressOf.get(positional) ?? positional,
          gaps: gapsBetween(
            nodes,
            Array.from({ length: section.pathPuzzles }, (_, k) => puzzleAt(k))
          ),
          after: section.chambersByIndex ?? {},
          nodes,
        }
      })
    const sideAfter = sides.some(side => Object.keys(side.after).length > 0)
    if (mainTotal === 0 && !sideAfter) return

    const roomAt = rooms(state)
    const exitsOf = nodeExitsOf(state)
    const laid = state.lay?.laid
    const dropEnds = state.drops.flatMap(drop => [drop.from, drop.to])
    const taken = new Set<string>([
      keyOf(state.maze.entrance),
      keyOf(state.maze.exit),
      ...roomAt.keys(),
      ...state.forks.reserved,
      ...state.switchRooms.keys(),
      ...state.forkSwitchRooms.keys(),
      ...state.switchWays.flatMap(ways => ways.map(({ cell }) => cell)),
      ...[...state.pipeHoles.values()].map(({ cell }) => cell),
      ...dropEnds,
      ...gateAtCell(state.lay).keys(),
      ...regionDoorAt(state.lay).keys(),
      ...absorbedCell(state.lay),
      ...(laid?.doors ?? []),
      ...(laid?.thresholds ?? []),
    ])
    const seatedRegion = (key: string) => {
      const region = laid?.label.get(key)
      return region !== undefined && (laid?.seatDemand.get(region) ?? 0) > 0
    }

    // A node's ways out as the renderer writes them: its passages, and a drop's end where one lands or leaves.
    const dirsOf = (key: string): Direction[] => exitsOf(key).map(({ dir }) => dir)
    const waysOut = (key: string) => dirsOf(key).length + dropEnds.filter(end => end === key).length
    const claimsFloor = (key: string): boolean => {
      if (chambers.has(key)) return true
      const spec = roomAt.get(key)
      if (spec?.roomType === "fork" || spec?.roomType === "portal") return true
      return state.branches.used.has(key) && waysOut(key) !== 2
    }
    const free = (key: string): boolean => {
      if (taken.has(key) || chambers.has(key) || seatedRegion(key) || waysOut(key) !== 2) return false
      const [r, c] = key.split(",").map(Number)
      return NEAR_NODES.every(([dr, dc]) => !claimsFloor(`${r + dr},${c + dc}`))
    }
    const isVertical = (key: string) => {
      const dirs = dirsOf(key)
      return dirs.includes("n") && dirs.includes("s")
    }
    const rank = (key: string) => hashString(`${siteId}|chamber|${key}`)
    const byPreference = (a: string, b: string) =>
      Number(isVertical(a)) - Number(isVertical(b)) || rank(a) - rank(b) || a.localeCompare(b)
    const dressable = (key: string): boolean => (state.labels.dressing.get(key)?.props?.length ?? 0) > 0
    const bestIn = (gap: Gap, activity: ActivityId | true = true): string | undefined =>
      gap.filter(key => free(key) && (activity !== true || dressable(key))).sort(byPreference)[0]
    const seatOn = (key: string, activity: ActivityId | true) =>
      chambers.set(key, { roomType: "chamber", ...(activity === true ? {} : { authoredActivity: activity }) })

    // Every chamber authored after a puzzle first: it is the only one a floor must seat.
    const short: Shortfall[] = []
    const seatAfter = (address: string, gaps: readonly Gap[], after: Record<number, ActivityId | true>) => {
      const held = new Set<number>()
      for (const [k, activity] of Object.entries(after).sort(([a], [b]) => Number(a) - Number(b))) {
        const key = gaps[Number(k)] === undefined ? undefined : bestIn(gaps[Number(k)], activity)
        if (key === undefined) continue
        seatOn(key, activity)
        held.add(Number(k))
      }
      const wanted = Object.keys(after).length
      if (held.size < wanted) short.push({ type: "chambersNotSeated", address, wanted, seated: held.size })
      return held
    }
    const puzzleSteps = [...contentNow(state).puzzleRole].sort(([, a], [, b]) => a - b).map(([step]) => step)
    const mainNodes = mainPath.map(keyOf)
    const mainGaps = gapsBetween(mainNodes, puzzleSteps.length > 0 ? puzzleSteps : [0])
    const holding = seatAfter(MAIN_SECTION_ADDRESS, mainGaps, mainAfter)
    for (const side of sides) seatAfter(side.address, side.gaps, side.after)
    if (short.length > 0) return { retry: short }

    // The rest of the count where the spread wants them, else to the nearest main gap with room: an empty gap
    // first, then one that already holds a chamber. What the main path has no room for goes to the side paths.
    let wanted = mainTotal - holding.size
    for (const target of spreadTargets(wanted, mainGaps.length)) {
      const byDistance = mainGaps.map((_, i) => i).sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)
      const pick =
        byDistance.find(i => !holding.has(i) && bestIn(mainGaps[i]) !== undefined) ??
        byDistance.find(i => bestIn(mainGaps[i]) !== undefined)
      const key = pick === undefined ? undefined : bestIn(mainGaps[pick])
      if (pick === undefined || key === undefined) break
      seatOn(key, true)
      holding.add(pick)
      wanted -= 1
    }
    // A side path holding fewer chambers comes first, so they spread over the paths; its lock regions are not floor.
    const held = (side: SidePath) => side.nodes.filter(key => chambers.has(key)).length
    for (; wanted > 0; wanted -= 1) {
      const pick = sides
        .flatMap(side =>
          side.nodes
            .filter(key => laid?.label.get(key) === undefined && free(key) && dressable(key))
            .map(key => ({ key, n: held(side) }))
        )
        .sort((a, b) => a.n - b.n || byPreference(a.key, b.key))[0]
      if (pick === undefined) break
      seatOn(pick.key, true)
    }
  }
)
