// WHAT ONE VISIT TO A PYRAMID CAN DO UNDER HELD WEB KEYS, read off its carved floors (docs/instructions/sand-pyramid.md,
// "What a visit can do under held keys H"): each floor walked as a lock with only the held keys arriving, every other
// web door sealed, and the player coming back at the entrance where the journey is a web's. This is what the web walk
// asks in place of its graph (`WalkOptions.visit`), so a floor played into waiting on a key is seen in its real states.
import { MAIN_SECTION_ADDRESS } from "../game/carve/sections"
import { floorLock, isWebKey, regionsOf } from "../game/floorLock"
import { finished, MAX_LOCK_STATES, reachableStates } from "../game/lockWalk"
import { mechanismGatesOf } from "../game/mechanismDoors"
import { reachableFrom } from "../game/siteValidator"
import type { Direction, FloorGrid, GridCell } from "../game/siteTypes"
import type { PyramidRef, ResolvedWeb } from "../game/webLine"
import { isLockRegion, pyramidName, startNode } from "../game/webLine"
import type { Visit } from "../game/webWalk"
import { bindingFace } from "../game/webWalk"
import type { CarvedPyramid, ReadWorld } from "./webWorld"
import { mainFloors } from "./webWorld"

type Pos = readonly [number, number]
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const key = ([r, c]: Pos) => `${r},${c}`

const keysOf = (cell: GridCell): string[] =>
  cell.type === "room" ? [...(cell.requiredKeyId ? [cell.requiredKeyId] : []), ...(cell.requiredKeyIds ?? [])] : []

/** The cells beside one, joined to it both ways. */
const besideOf = (grid: FloorGrid, [r, c]: Pos): Pos[] => {
  const cell = grid.cells[r]?.[c]
  if (!cell || cell.type === "empty") return []
  return [...cell.dirs].flatMap(dir => {
    const next: Pos = [r + MOVES[dir][0], c + MOVES[dir][1]]
    const there = grid.cells[next[0]]?.[next[1]]
    return there && there.type !== "empty" && there.dirs.has(OPPOSITE[dir]) ? [next] : []
  })
}

type FloorVisit = { exit: boolean; reached: Set<string>; waiting: Set<string> } | "tooLarge"

/** One floor walked with the held keys arriving: the cells some state stands in, whether the way out is reached, and
 * the cells a state that can no longer reach it stands in. */
const walkFloor = (grid: FloorGrid, held: ReadonlySet<string>, reentry: boolean): FloorVisit => {
  const doorKeys = new Set(grid.cells.flatMap(row => row.flatMap(keysOf)))
  const arriving = new Set([...doorKeys].filter(id => isWebKey(id) && held.has(id)))
  const lock = floorLock(grid, { arriving })
  if (!lock) {
    // Nothing on the floor moves: every key but the web's is taken as held, as the web's graph takes it.
    const keys = new Set([...doorKeys].filter(id => !isWebKey(id)))
    const reached = reachableFrom(grid, grid.entrancePos, keys, undefined, undefined, true, mechanismGatesOf(grid))
    return { exit: reached.has(key(grid.exitPos)), reached, waiting: new Set() }
  }
  const found = reachableStates(lock, MAX_LOCK_STATES, { reentry })
  if (found === "tooLarge") return "tooLarge"
  const { order, edges } = found
  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
  const finishes = new Set<number>()
  const queue: number[] = []
  order.forEach((state, n) => {
    if (finished(lock, state)) {
      finishes.add(n)
      queue.push(n)
    }
  })
  for (let at = 0; at < queue.length; at++)
    for (const from of backwards[queue[at]])
      if (!finishes.has(from)) {
        finishes.add(from)
        queue.push(from)
      }
  // Where a state that cannot reach the way out may still walk: what a player left waiting stands beside.
  const stuck = new Set<number>()
  const forward = order.flatMap((_, n) => (finishes.has(n) ? [] : [n]))
  for (const n of forward) stuck.add(n)
  for (let at = 0; at < forward.length; at++)
    for (const to of edges[forward[at]])
      if (!stuck.has(to)) {
        stuck.add(to)
        forward.push(to)
      }
  const regions = new Set(order.map(state => state.region))
  const waitingRegions = new Set([...stuck].map(n => order[n].region))
  const { of } = regionsOf(grid)
  const reached = new Set<string>()
  const waiting = new Set<string>()
  for (const [cell, region] of of) {
    if (regions.has(region)) reached.add(cell)
    if (waitingRegions.has(region)) waiting.add(cell)
  }
  return { exit: finishes.size > 0, reached, waiting }
}

/**
 * A VISIT READ OFF THE CARVED FLOORS: the floors of the pyramid's main path walked in turn, each entered only once the
 * one below is left by its way out. Undefined where a floor's walk is too large, and the web's graph answers instead.
 */
export const carvedVisit =
  (
    read: ReadWorld & { pyramids: Readonly<Record<number, readonly CarvedPyramid[]>> },
    resolved: ResolvedWeb,
    reentryJourneys: ReadonlySet<number>
  ) =>
  (at: PyramidRef, held: ReadonlySet<string>): Visit | undefined => {
    const pyramid = read.pyramids[at.journey]?.[at.pyramid - 1]
    const seats = read.seats.get(pyramidName(at))
    if (!pyramid || !seats) return undefined
    const reach = new Set<string>()
    const seen = new Map<string, string>()
    const waitsOn = new Set<string>()
    const floors = mainFloors(pyramid.configs)
    let exit = false
    for (let f = 0; f < floors; f++) {
      const grid = pyramid.grids[f]
      const walked = walkFloor(grid, held, reentryJourneys.has(at.journey))
      if (walked === "tooLarge") return undefined
      reach.add(startNode(f))
      for (const [node, cell] of seats[f].cells) if (walked.reached.has(key(cell))) reach.add(node)
      // The web's shut doors standing beside ground the floor reaches: each seen, and waited on where a state that can
      // no longer leave stands beside it, or, where the floor's way out is not reached at all, unless it opens a side
      // section.
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          const keys = keysOf(cell).filter(id => isWebKey(id) && !held.has(id))
          if (keys.length === 0) return
          const beside = besideOf(grid, [r, c])
          if (!beside.some(pos => walked.reached.has(key(pos)))) return
          for (const door of resolved.doors)
            if (pyramidName(door.at) === pyramidName(at) && door.where.floor === f && keys.includes(door.key))
              seen.set(door.id, door.key)
          for (const binding of resolved.bindings)
            if (
              pyramidName(binding.at) === pyramidName(at) &&
              binding.floor === f &&
              keys.includes(binding.key) &&
              cell.type !== "empty" &&
              cell.region?.startsWith(`${binding.lock}.`)
            )
              seen.set(bindingFace(binding), binding.key)
          const aside =
            cell.type !== "empty" && cell.sectionAddress !== MAIN_SECTION_ADDRESS && !isLockRegion(cell.region)
          if (walked.exit ? beside.some(pos => walked.waiting.has(key(pos))) : !aside)
            keys.forEach(id => waitsOn.add(id))
        })
      )
      if (!walked.exit) break
      if (f === floors - 1) exit = true
    }
    return { exit, reach, seen, waitsOn }
  }
