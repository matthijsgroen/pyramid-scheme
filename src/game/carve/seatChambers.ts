import { hashString } from "@/support/hashString"
import type { ActivityId } from "../activities"
import type { Direction } from "../siteTypes"
import { absorbedCell, contentNow, gateAtCell, keyOf, nodeExitsOf, regionDoorAt, rooms } from "./derive"
import { MAIN_SECTION_ADDRESS } from "./sections"
import { pass } from "./state"
import type { Cell, RoomSpec, Shortfall } from "./state"

/** One stretch of a path between a puzzle and whatever stands next along it: the nodes a chamber may take. */
type Gap = readonly string[]

/** One path's chambers as authored: its gaps in path order, the chamber after each puzzle, and how many in all. */
type PathChambers = { address: string; gaps: readonly Gap[]; after: Record<number, ActivityId | true>; total: number }

/** The offsets of every node whose 3×3 meets a node's own: the two the corridor runs to and the four diagonals. */
const NEAR: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [-2, 0],
  [-2, 2],
  [0, -2],
  [0, 2],
  [2, -2],
  [2, 0],
  [2, 2],
]

/** Where `count` chambers spread over `gaps` gaps want to stand, evenly, the middle of each share first. */
const spreadTargets = (count: number, gaps: number): number[] =>
  Array.from({ length: count }, (_, i) => Math.min(gaps - 1, Math.floor(((i + 0.5) * gaps) / count)))

/**
 * A PASS-THROUGH CHAMBER IS A FREE NODE OF A PATH WIDENED INTO A ROOM, in the gap after the puzzle it was authored
 * after (`chambersByIndex`), and on the main path as many more as `chambers` asks, spread over the gaps between
 * its puzzles. No puzzle moves: a chamber takes only a node nothing stands on.
 *
 * Free is a corridor node with exactly two ways out that no pass seated anything on: no gate, control, lever, laid
 * door, threshold, drop, stair, fork, switch or pipe hole, and none of a lock region a mechanic will stand its seats
 * in. It runs after every pass that seats something on a node, so none of them has to know chambers exist.
 *
 * No chamber stands where its 3×3 meets another room that claims floor (a fork, a portal, a dead end, another
 * chamber): two claims would contest a diagonal. A turn or a horizontal comes before a vertical, whose corridor
 * crosses the north row a prop stands against. Ties break by hash, never by `rand()`, so no other draw moves.
 * A path whose gaps hold no free node for a chamber it declares refuses the attempt.
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
  ],
  ["chambers"],
  (prep, state) => {
    const { config, addressOf } = prep.config
    const { siteId } = prep.input
    const chambers = new Map<string, RoomSpec>()
    state.chambers = chambers

    const paths: PathChambers[] = []
    const { mainPath } = state.maze
    const mainAfter = config.chambersByIndex ?? {}
    const mainTotal = Math.max(config.chambers ?? 0, Object.keys(mainAfter).length)
    if (mainTotal > 0) {
      const puzzleSteps = [...contentNow(state).puzzleRole].sort(([, a], [, b]) => a - b).map(([step]) => step)
      const bounds = puzzleSteps.length > 0 ? puzzleSteps : [0]
      const gaps = bounds.map((from, k) =>
        mainPath.slice(from + 1, k + 1 < bounds.length ? bounds[k + 1] : mainPath.length - 1).map(keyOf)
      )
      paths.push({ address: MAIN_SECTION_ADDRESS, gaps, after: mainAfter, total: mainTotal })
    }
    for (const { section, cells, positional, laid } of state.keys.chains) {
      const after = section.chambersByIndex
      if (laid || after === undefined || Object.keys(after).length === 0) continue
      const puzzleAt = (k: number) =>
        cells.findIndex(cell => {
          const spec = state.chainRooms.get(keyOf(cell))
          return spec?.roomType === "encounter" && spec.family !== undefined && spec.pathIndex === k
        })
      const at = Array.from({ length: section.pathPuzzles }, (_, k) => puzzleAt(k))
      const gaps = at.map((from, k) =>
        from < 0
          ? []
          : cells.slice(from + 1, k + 1 < at.length ? at[k + 1] : cells.length - 1).map((cell: Cell) => keyOf(cell))
      )
      paths.push({
        address: addressOf.get(positional) ?? positional,
        gaps,
        after,
        total: Object.keys(after).length,
      })
    }
    if (paths.length === 0) return

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
      if (spec?.roomType === "fork" || spec?.roomType === "portal" || spec?.authoredActivity !== undefined) return true
      return state.branches.used.has(key) && waysOut(key) !== 2
    }
    const free = (key: string): boolean => {
      if (taken.has(key) || chambers.has(key) || seatedRegion(key) || waysOut(key) !== 2) return false
      const [r, c] = key.split(",").map(Number)
      return NEAR.every(([dr, dc]) => !claimsFloor(`${r + dr},${c + dc}`))
    }
    const isVertical = (key: string) => {
      const dirs = dirsOf(key)
      return dirs.includes("n") && dirs.includes("s")
    }
    const rank = (key: string) => hashString(`${siteId}|chamber|${key}`)
    const bestIn = (gap: Gap): string | undefined =>
      gap
        .filter(free)
        .sort((a, b) => Number(isVertical(a)) - Number(isVertical(b)) || rank(a) - rank(b) || a.localeCompare(b))[0]

    const short: Shortfall[] = []
    for (const { address, gaps, after, total } of paths) {
      let seated = 0
      const holding = new Set<number>()
      const seat = (gapIndex: number, activity: ActivityId | true): boolean => {
        const key = gaps[gapIndex] === undefined ? undefined : bestIn(gaps[gapIndex])
        if (key === undefined) return false
        chambers.set(key, { roomType: "chamber", ...(activity === true ? {} : { authoredActivity: activity }) })
        holding.add(gapIndex)
        seated += 1
        return true
      }
      for (const [k, activity] of Object.entries(after).sort(([a], [b]) => Number(a) - Number(b)))
        seat(Number(k), activity)
      // The rest go where the spread wants them, else to the nearest gap with room: an empty gap first, then one
      // that already holds a chamber.
      for (const target of spreadTargets(total - Object.keys(after).length, gaps.length)) {
        const byDistance = gaps.map((_, i) => i).sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)
        const pick =
          byDistance.find(i => !holding.has(i) && bestIn(gaps[i]) !== undefined) ??
          byDistance.find(i => bestIn(gaps[i]) !== undefined)
        if (pick !== undefined) seat(pick, true)
      }
      if (seated < total) short.push({ type: "chambersNotSeated", address, wanted: total, seated })
    }
    if (short.length > 0) return { retry: short }
  }
)
