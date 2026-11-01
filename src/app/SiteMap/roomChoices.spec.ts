import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { STEP, prefabRoomAt, roomDoors, type RoomDoor } from "@/game/roomShape"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import {
  EDGE_NODE,
  CROSSING_NODE,
  PREFAB_FORK,
  crossingFloor,
  doorStopForkFloor,
  edgePrefabFloor,
  fitForkFloor,
  prefabForkFloor,
} from "./floorFixtures.testing"
import { roomChoices, roomEntry, roomHub, type RoomChoice, type RoomChoiceTo } from "./roomChoices"
import { freeCells } from "./roomWalk"

type Cell = readonly [number, number]

// The hall over the fork: stop 6,8; doors west 4,2, east 4,10, south 7,6 and, with `north`, north 2,6.
const hall = revealAll(prefabForkFloor({}, true))

describe("the choices standing in a designed room", () => {
  it("two doors on one side share an arrow, which leads to the cell where their routes split", () => {
    expect(roomChoices(hall, PREFAB_FORK, [6, 8])).toEqual([
      { dir: "w", arrowAt: [6, 7], to: { kind: "waypoint", at: [6, 6] } },
      { dir: "e", arrowAt: [6, 9], to: { kind: "door", at: [4, 10] } },
    ])
  })

  it("from the split each way has its own direction, and one leads back to the stop", () => {
    expect(roomChoices(hall, PREFAB_FORK, [6, 6])).toEqual([
      { dir: "s", arrowAt: [7, 6], to: { kind: "door", at: [7, 6] } },
      { dir: "e", arrowAt: [6, 7], to: { kind: "stop", at: [6, 8] } },
      { dir: "n", arrowAt: [5, 6], to: { kind: "waypoint", at: PREFAB_FORK } },
    ])
    expect(roomChoices(hall, PREFAB_FORK, PREFAB_FORK)).toEqual([
      { dir: "n", arrowAt: [3, 6], to: { kind: "door", at: [2, 6] } },
      { dir: "s", arrowAt: [5, 6], to: { kind: "waypoint", at: [6, 6] } },
      { dir: "e", arrowAt: [4, 7], to: { kind: "door", at: [4, 10] } },
      { dir: "w", arrowAt: [4, 5], to: { kind: "door", at: [4, 2] } },
    ])
  })

  it("a door at the stop's own side leads straight out, its arrow on the door", () => {
    const grid = revealAll(doorStopForkFloor({}, true))
    expect(roomChoices(grid, PREFAB_FORK, [6, 6])).toContainEqual({
      dir: "s",
      arrowAt: [7, 6],
      to: { kind: "door", at: [7, 6] },
    })
  })

  it("a door that does not open is no destination", () => {
    const choices = roomChoices(hall, PREFAB_FORK, PREFAB_FORK, door => door.side !== "n")
    expect(choices.map(({ to }) => to.at)).not.toContainEqual([2, 6])
    expect(choices).toHaveLength(3)
  })
})

// The crossing: a pillar in its middle at 4,6 and the stop just east of it.
const crossing = revealAll(crossingFloor())
const doorOf = (grid: FloorGrid, node: Cell, side: Direction) =>
  roomDoors(grid, ...node).find(door => door.side === side)!
const crossingDoor = (side: Direction) => doorOf(crossing, CROSSING_NODE, side)

describe("the hub entering a designed room leads to", () => {
  it("is the free cell nearest the room's centre, of several the one nearest the door he came in by", () => {
    expect(roomHub(crossing, CROSSING_NODE, crossingDoor("n"))).toEqual([3, 6])
    expect(roomHub(crossing, CROSSING_NODE, crossingDoor("s"))).toEqual([5, 6])
    expect(roomHub(crossing, CROSSING_NODE, crossingDoor("w"))).toEqual([4, 5])
    expect(roomHub(hall, PREFAB_FORK, doorOf(hall, PREFAB_FORK, "s"))).toEqual([5, 6])
    expect(roomHub(hall, PREFAB_FORK, doorOf(hall, PREFAB_FORK, "w"))).toEqual(PREFAB_FORK)
  })

  it("entering by a door stands him on it, the way back out among its choices", () => {
    expect(roomEntry(crossing, CROSSING_NODE, crossingDoor("n"))).toEqual({ kind: "waypoint", at: [3, 6] })
    expect(roomChoices(crossing, CROSSING_NODE, [3, 6])).toEqual([
      { dir: "n", arrowAt: [2, 6], to: { kind: "door", at: [2, 6] } },
      { dir: "e", arrowAt: [3, 7], to: { kind: "stop", at: [4, 7] } },
      { dir: "w", arrowAt: [3, 5], to: { kind: "door", at: [4, 4] } },
    ])
  })

  it("entering where only one choice leads on past the way back walks straight there", () => {
    const onlyBack = (door: RoomDoor) => door.side === "n"
    expect(roomEntry(crossing, CROSSING_NODE, crossingDoor("n"), onlyBack)).toEqual({ kind: "stop", at: [4, 7] })
  })

  it("entering where the hub is the stop ends on the stop", () => {
    expect(roomHub(crossing, CROSSING_NODE, crossingDoor("e"))).toEqual(CROSSING_NODE)
    expect(roomEntry(crossing, CROSSING_NODE, crossingDoor("e"))).toEqual({ kind: "stop", at: CROSSING_NODE })
  })
})

// The rule as written, by listing every shortest path: what the distance-map version must agree with.
const DIRS: Direction[] = ["n", "e", "s", "w"]
const keyOf = ([r, c]: Cell) => `${r},${c}`
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]
const everyShortestPath = (free: ReadonlySet<string>, from: Cell, to: Cell): Cell[][] => {
  const dist = new Map([[keyOf(to), 0]])
  const queue: Cell[] = [to]
  for (let i = 0; i < queue.length; i++)
    for (const d of DIRS) {
      const next: Cell = [queue[i][0] + STEP[d][0], queue[i][1] + STEP[d][1]]
      if (free.has(keyOf(next)) && !dist.has(keyOf(next))) {
        dist.set(keyOf(next), dist.get(keyOf(queue[i]))! + 1)
        queue.push(next)
      }
    }
  if (!dist.has(keyOf(from))) return []
  const paths: Cell[][] = []
  const walk = (at: Cell, path: Cell[]): void => {
    if (same(at, to)) return void paths.push(path)
    for (const d of DIRS) {
      const next: Cell = [at[0] + STEP[d][0], at[1] + STEP[d][1]]
      if (dist.get(keyOf(next)) === dist.get(keyOf(at))! - 1) walk(next, [...path, next])
    }
  }
  walk(from, [])
  return paths
}
const sharedPrefix = (a: readonly Cell[], b: readonly Cell[]) => {
  let n = 0
  while (n < a.length && n < b.length && same(a[n], b[n])) n++
  return n
}
const choicesByListing = (grid: FloorGrid, node: Cell, standing: Cell): RoomChoice[] => {
  const room = prefabRoomAt(grid, node[0], node[1])!
  const free = freeCells(grid, node, room)
  const destinations = roomDoors(grid, node[0], node[1]).map(door => ({
    to: { kind: "door", at: door.at } as RoomChoiceTo,
    candidates: everyShortestPath(free, standing, door.inside).map(path => [...path, door.at]),
  }))
  if (!same(standing, room.stop))
    destinations.push({
      to: { kind: "stop", at: room.stop },
      candidates: everyShortestPath(free, standing, room.stop),
    })
  const chosen: { to: RoomChoiceTo; path: Cell[] }[] = []
  for (const destination of destinations
    .filter(({ candidates }) => candidates.length > 0)
    .sort((a, b) => a.candidates[0].length - b.candidates[0].length)) {
    let best = destination.candidates[0]
    let bestShare = -1
    for (const path of destination.candidates) {
      const share = Math.max(0, ...chosen.map(way => sharedPrefix(way.path, path)))
      if (share > bestShare) [best, bestShare] = [path, share]
    }
    chosen.push({ to: destination.to, path: best })
  }
  const groups = new Map<Direction, { to: RoomChoiceTo; path: Cell[] }[]>()
  for (const way of chosen) {
    const dir = DIRS.find(d => same([standing[0] + STEP[d][0], standing[1] + STEP[d][1]], way.path[0]))!
    groups.set(dir, [...(groups.get(dir) ?? []), way])
  }
  return [...groups].map(([dir, group]) => {
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

describe("the choices read off distances", () => {
  const rooms: [string, FloorGrid, Cell][] = [
    ["the hall over a fork", hall, PREFAB_FORK],
    ["the hall with a fit stop", revealAll(fitForkFloor()), PREFAB_FORK],
    ["the hall with its stop at a door", revealAll(doorStopForkFloor({}, true)), PREFAB_FORK],
    ["a chamber on its rect's corner", revealAll(edgePrefabFloor("L")), EDGE_NODE.L],
    ["a fork on its rect's corner", revealAll(edgePrefabFloor("T")), EDGE_NODE.T],
    ["a crossing round a pillar", crossing, CROSSING_NODE],
  ]

  it.each(rooms)("are the ones listing every shortest path gives, from every free cell of %s", (_, grid, node) => {
    const free = freeCells(grid, node, prefabRoomAt(grid, node[0], node[1])!)
    expect(free.size).toBeGreaterThan(5)
    for (const key of free) {
      const standing = key.split(",").map(Number) as unknown as Cell
      expect(roomChoices(grid, node, standing), key).toEqual(choicesByListing(grid, node, standing))
    }
  })
})
