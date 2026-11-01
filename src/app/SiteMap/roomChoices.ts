import type { Direction, FloorGrid } from "@/game/siteTypes"
import { STEP, prefabRoomAt, roomDoors, type RoomDoor } from "@/game/roomShape"
import { freeCells } from "./roomWalk"

type Cell = readonly [number, number]

/** Where the explorer stands: his cell, and in a designed room the waypoint he stands on when it is not the room's
 * stop. A save keeps the cell only, so a reload on a waypoint stands on the stop. */
export type ExplorerPlace = { pos: Cell; waypoint?: Cell }

/** Where a room choice leads: out by a door, back to the stop, or on to a waypoint where routes split. `at` is the cell
 * walked to: the door place, the room's stop, or the waypoint. */
export type RoomChoiceTo = { kind: "door" | "stop" | "waypoint"; at: Cell }

/** One arrow in a room: the compass direction it points, the cell it stands on (the first step that way) and where a
 * tap on it leads. */
export type RoomChoice = { dir: Direction; arrowAt: Cell; to: RoomChoiceTo }

const DIRS: Direction[] = ["n", "e", "s", "w"]
const keyOf = ([r, c]: Cell) => `${r},${c}`
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]
const stepTo = (at: Cell, dir: Direction): Cell => [at[0] + STEP[dir][0], at[1] + STEP[dir][1]]
const dirOf = (from: Cell, to: Cell): Direction => DIRS.find(dir => same(stepTo(from, dir), to))!

/** Every free cell's step count from `from`, 4-connected. */
const distancesFrom = (free: ReadonlySet<string>, from: Cell): Map<string, number> => {
  const dist = new Map([[keyOf(from), 0]])
  const queue: Cell[] = [from]
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]
    for (const dir of DIRS) {
      const next = stepTo(at, dir)
      if (!free.has(keyOf(next)) || dist.has(keyOf(next))) continue
      dist.set(keyOf(next), dist.get(keyOf(at))! + 1)
      queue.push(next)
    }
  }
  return dist
}

const sharedPrefix = (a: readonly Cell[], b: readonly Cell[]) => {
  let n = 0
  while (n < a.length && n < b.length && same(a[n], b[n])) n++
  return n
}

/** Whether path `a` comes before path `b` in n-e-s-w order, both leaving `from`: by the first step they differ in. */
const before = (from: Cell, a: readonly Cell[], b: readonly Cell[]): boolean => {
  const n = sharedPrefix(a, b)
  if (n >= a.length || n >= b.length) return false
  const at = n === 0 ? from : a[n - 1]
  return DIRS.indexOf(dirOf(at, a[n])) < DIRS.indexOf(dirOf(at, b[n]))
}

/**
 * Of the shortest paths from `standing` to `target` (`standing` left out, `target` included), the one sharing the
 * longest prefix with a path in `taken`; ties go to the path first in n-e-s-w order. Read off two distance maps rather
 * than by listing every shortest path, which a wide open room has thousands of.
 */
const pathSharingMost = (
  free: ReadonlySet<string>,
  standing: Cell,
  target: Cell,
  taken: readonly (readonly Cell[])[]
): Cell[] | undefined => {
  const toTarget = distancesFrom(free, target)
  const length = toTarget.get(keyOf(standing))
  if (length === undefined) return undefined
  // From a cell on a shortest path, the n-e-s-w-first rest of the way.
  const restFrom = (at: Cell): Cell[] => {
    const rest: Cell[] = []
    for (let left = toTarget.get(keyOf(at))!; left > 0; left--) {
      at = stepTo(
        at,
        DIRS.find(dir => toTarget.get(keyOf(stepTo(at, dir))) === left - 1)!
      )
      rest.push(at)
    }
    return rest
  }
  let best = restFrom(standing)
  let bestShare = 0
  for (const path of taken) {
    // A taken path's cells lie on a shortest path to the target for as long as the two can share a prefix.
    let n = 0
    while (n < path.length && toTarget.get(keyOf(path[n])) === length - (n + 1)) n++
    if (n === 0) continue
    const candidate = [...path.slice(0, n), ...restFrom(path[n - 1])]
    if (n > bestShare || (n === bestShare && before(standing, candidate, best))) [best, bestShare] = [candidate, n]
  }
  return best
}

/**
 * The choices from `standing` (the room's stop or a waypoint in it): one per compass direction a route leaves in.
 *
 * Every destination is a door that `opens` (walked to its `inside`, then out by its place) and, off the stop, the stop.
 * Nearest first, each takes the shortest path sharing the longest prefix with a path already taken. Grouped by first
 * step, a lone destination is led to straight; several are led to the last cell their paths share, a waypoint, or the
 * stop when that is the cell.
 */
export const roomChoices = (
  grid: FloorGrid,
  node: Cell,
  standing: Cell,
  opens: (door: RoomDoor) => boolean = () => true
): RoomChoice[] => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return []
  const free = freeCells(grid, node, room)
  const destinations: { to: RoomChoiceTo; target: Cell; tail: Cell[] }[] = roomDoors(grid, node[0], node[1])
    .filter(opens)
    .map(door => ({ to: { kind: "door", at: door.at }, target: door.inside, tail: [door.at] }))
  if (!same(standing, room.stop))
    destinations.push({ to: { kind: "stop", at: room.stop }, target: room.stop, tail: [] })
  const measured = destinations.flatMap(destination => {
    const steps = distancesFrom(free, destination.target).get(keyOf(standing))
    return steps === undefined ? [] : [{ ...destination, steps: steps + destination.tail.length }]
  })
  const chosen: { to: RoomChoiceTo; path: Cell[] }[] = []
  for (const destination of measured.sort((a, b) => a.steps - b.steps)) {
    const path = pathSharingMost(
      free,
      standing,
      destination.target,
      chosen.map(({ path }) => path)
    )
    if (path) chosen.push({ to: destination.to, path: [...path, ...destination.tail] })
  }
  const groups = new Map<Direction, { to: RoomChoiceTo; path: Cell[] }[]>()
  for (const way of chosen) {
    const dir = dirOf(standing, way.path[0])
    groups.set(dir, [...(groups.get(dir) ?? []), way])
  }
  return [...groups].map(([dir, group]): RoomChoice => {
    const arrowAt = group[0].path[0]
    if (group.length === 1) return { dir, arrowAt, to: group[0].to }
    const split = group[0].path[Math.min(...group.slice(1).map(way => sharedPrefix(group[0].path, way.path))) - 1]
    return {
      dir,
      arrowAt,
      to: same(split, room.stop) ? { kind: "stop", at: room.stop } : { kind: "waypoint", at: split },
    }
  })
}

/** The room spot an explorer at `place` stands on: his waypoint, else the stop of the room at his cell. */
export const standingSpot = (grid: FloorGrid, place: ExplorerPlace): Cell =>
  place.waypoint ?? prefabRoomAt(grid, place.pos[0], place.pos[1])?.stop ?? place.pos
