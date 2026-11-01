import { afterEach, describe, expect, it, vi } from "vitest"
import { roomDoors } from "@/game/roomShape"
import { registerFamily } from "@/app/families/familyRegistry"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { CELL, COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import {
  EDGE_NODE,
  PREFAB_FORK,
  PREFAB_PILLARS,
  edgePrefabFloor,
  fitForkFloor,
  floorFrom,
  prefabForkFloor,
} from "./floorFixtures.testing"
import { markerCell, roomPath, roomStop, stepsBetween, walkPoints, walkSteps } from "./roomWalk"
import type { RoomEnd, WalkPoint } from "./roomWalk"

type Cell = readonly [number, number]

/** The first door on a side of the room at `node`, as a walk end. */
const doorOn = (grid: FloorGrid, node: Cell, side: "n" | "s" | "e" | "w"): RoomEnd => {
  const door = roomDoors(grid, node[0], node[1]).find(candidate => candidate.side === side)
  if (!door) throw new Error(`no ${side} door`)
  return { doorAt: door.at }
}

/** The box an object's sprite stands in on its cell. */
const boxOf = ([r, c]: Cell) => {
  const { cx, cy } = cellCenter(r, c)
  return { x0: cx - CELL / 2, y0: cy - CELL / 2, x1: cx + CELL / 2, y1: cy + CELL / 2 }
}
const inBox = (p: WalkPoint, box: ReturnType<typeof boxOf>) =>
  p.x > box.x0 && p.x < box.x1 && p.y > box.y0 && p.y < box.y1
const cuts = (a: WalkPoint, b: WalkPoint, cells: readonly Cell[]) => {
  for (let t = 0; t <= 1; t += 0.01) {
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    if (cells.some(cell => inBox(p, boxOf(cell)))) return true
  }
  return false
}
const length = (pts: readonly WalkPoint[]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0)
const run = (...cells: string[]) => cells.map(at => at.split(",").map(Number) as [number, number])
const atCentre = (p: WalkPoint, [r, c]: Cell) => p.x === cellCenter(r, c).cx && p.y === cellCenter(r, c).cy
const none = () => ({ dx: 0, dy: 0 })

/** Every cell an object or the ring blocks in the room at `node`, inside its rect. */
const blockedIn = (grid: FloorGrid, [r, c]: Cell): Cell[] => {
  const cell = grid.cells[r][c]
  const room = cell.type === "empty" ? undefined : cell.prefabRoom
  return (room?.objects ?? []).flatMap(o =>
    Array.from({ length: o.rows * o.cols }, (_, i): Cell => [o.top + Math.floor(i / o.cols), o.left + (i % o.cols)])
  )
}

/** The shortest walk over the room's free cell centres, by any straight line that crosses no blocked cell: the
 * yardstick the room's own walk is held to. */
const shortestOver = (grid: FloorGrid, node: Cell, a: Cell, b: Cell): number => {
  const cell = grid.cells[node[0]][node[1]]
  const room = cell.type === "empty" ? undefined : cell.prefabRoom
  if (!room) throw new Error("no room")
  const blocked = new Set(room.blocked)
  const { top, left, rows, cols } = room.rect
  const cells: Cell[] = []
  const walls: Cell[] = []
  for (let r = top; r < top + rows; r++)
    for (let c = left; c < left + cols; c++) (blocked.has(`${r},${c}`) ? walls : cells).push([r, c])
  const pt = ([r, c]: Cell): WalkPoint => ({ x: cellCenter(r, c).cx, y: cellCenter(r, c).cy })
  const pitchCuts = (p: WalkPoint, q: WalkPoint) => {
    for (let t = 0.001; t < 1; t += 0.001) {
      const x = p.x + (q.x - p.x) * t
      const y = p.y + (q.y - p.y) * t
      if (walls.some(w => Math.abs(x - pt(w).x) < COL_PITCH / 2 - 0.01 && Math.abs(y - pt(w).y) < ROW_PITCH / 2 - 0.01))
        return true
    }
    return false
  }
  const index = (at: Cell) => cells.findIndex(c => c[0] === at[0] && c[1] === at[1])
  const best = cells.map(() => Infinity)
  const done = cells.map(() => false)
  best[index(a)] = 0
  for (;;) {
    let u = -1
    cells.forEach((_, i) => {
      if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i
    })
    if (u < 0) break
    done[u] = true
    cells.forEach((c, v) => {
      if (done[v] || pitchCuts(pt(cells[u]), pt(c))) return
      best[v] = Math.min(best[v], best[u] + Math.hypot(pt(cells[u]).x - pt(c).x, pt(cells[u]).y - pt(c).y))
    })
  }
  return best[index(b)]
}

describe("a walk through a prefab room", () => {
  const grid = prefabForkFloor()
  const node = PREFAB_FORK
  const ends: RoomEnd[] = [doorOn(grid, node, "w"), doorOn(grid, node, "e"), doorOn(grid, node, "s"), "stop"]
  const endCell = (end: RoomEnd) => {
    const [p] = roomPath(grid, node, end, end)
    return run(
      ...[...Array(grid.rows).keys()].flatMap(r =>
        [...Array(grid.cols).keys()].filter(c => atCentre(p, [r, c])).map(c => `${r},${c}`)
      )
    )[0]
  }

  it("goes straight from a door to the stop when nothing stands between", () => {
    expect(roomPath(grid, node, doorOn(grid, node, "s"), "stop")).toHaveLength(2)
  })

  it("walks round a pillar between the west door and the stop, every point in the room", () => {
    const path = roomPath(grid, node, doorOn(grid, node, "w"), "stop")
    expect(path.length).toBeGreaterThan(2)
    for (const p of path) expect(p.inRoom).toBe(true)
    path.slice(1).forEach((p, i) => expect(cuts(path[i], p, PREFAB_PILLARS), `${i}`).toBe(false))
  })

  it("takes the shortest way over the room's floor for every pair of ends", () => {
    for (const a of ends)
      for (const b of ends) {
        const shortest = shortestOver(grid, node, endCell(a), endCell(b))
        expect(length(roomPath(grid, node, a, b)), `${JSON.stringify(a)}→${JSON.stringify(b)}`).toBeLessThanOrEqual(
          shortest + 1e-6
        )
      }
  })

  it("never crosses what stands in it", () => {
    const standing = blockedIn(grid, node)
    for (const a of ends)
      for (const b of ends) {
        const path = roomPath(grid, node, a, b)
        path.slice(1).forEach((p, i) => expect(cuts(path[i], p, standing)).toBe(false))
      }
  })

  it("walks round two pillars without zig-zag", () => {
    const pitch = (p: WalkPoint, q: WalkPoint) => Math.hypot((p.x - q.x) / COL_PITCH, (p.y - q.y) / ROW_PITCH)
    for (const a of ends)
      for (const b of ends) {
        const path = roomPath(grid, node, a, b)
        // Two turns within one cell are a step on the grid, not a way round anything.
        for (let i = 1; i + 2 < path.length; i++)
          expect(pitch(path[i], path[i + 1]), `${JSON.stringify(a)}→${JSON.stringify(b)} at ${i}`).toBeGreaterThan(1)
      }
  })

  describe("a room whose floor does not join its ends", () => {
    afterEach(() => vi.unstubAllEnvs())
    // The stop walled in on every side.
    const walledIn = (): FloorGrid => {
      const cells = grid.cells.map(row => [...row])
      const fork = cells[node[0]][node[1]]
      if (fork.type === "empty" || !fork.prefabRoom) throw new Error("no prefab room")
      const blocked = [...fork.prefabRoom.blocked, "6,7", "6,9", "5,7", "5,9"]
      cells[node[0]][node[1]] = { ...fork, prefabRoom: { ...fork.prefabRoom, blocked } } as GridCell
      return { ...grid, cells }
    }

    it("throws while developing", () => {
      expect(() => roomPath(walledIn(), node, doorOn(walledIn(), node, "w"), "stop")).toThrow(/no way from 4,3 to 6,8/)
    })

    it("walks a straight line in play", () => {
      vi.stubEnv("DEV", false)
      const path = roomPath(walledIn(), node, doorOn(walledIn(), node, "w"), "stop")
      expect(path.map(p => [p.x, p.y])).toEqual(
        run("4,3", "6,8").map(([r, c]) => [cellCenter(r, c).cx, cellCenter(r, c).cy])
      )
    })
  })

  it("meets the room at the prefab's stop, and no other cell", () => {
    expect(roomStop(grid, ...node)).toEqual([6, 8])
    expect(roomStop(grid, 4, 5)).toBeUndefined()
    expect(roomStop(grid, 0, 0)).toBeUndefined()
  })

  it("leaves a route through no prefab room exactly as today's waypoints", () => {
    const route = run("4,0", "4,1", "5,1")
    const points = walkPoints(grid, route, (r, c) => (r === 5 && c === 1 ? { dx: 5, dy: -4 } : { dx: 0, dy: 0 }))
    const at = (r: number, c: number) => cellCenter(r, c)
    expect(points).toEqual([
      { x: at(4, 0).cx, y: at(4, 0).cy },
      { x: at(4, 1).cx, y: at(4, 1).cy },
      { x: at(5, 1).cx + 5, y: at(5, 1).cy - 4 },
    ])
  })

  it("replaces a run through a prefab room with its walk", () => {
    const route = run("4,1", "4,2", "4,3", "4,4", "4,5", "4,6", "4,7", "4,8", "4,9", "4,10", "4,11")
    const points = walkPoints(grid, route, none)
    expect(points[0].inRoom).toBeUndefined()
    expect(points.at(-1)?.inRoom).toBeUndefined()
    const inside = points.filter(p => p.inRoom)
    expect(inside.length).toBeGreaterThan(1)
    inside.slice(1).forEach((p, i) => expect(cuts(inside[i], p, PREFAB_PILLARS)).toBe(false))
  })

  it("sets out from and comes to rest at the stop when the route starts or ends on an absorbed arm cell", () => {
    const stop = roomPath(grid, node, "stop", "stop")[0]
    const out = walkPoints(grid, run("4,5", "4,4", "4,3", "4,2", "4,1"), none)
    const back = walkPoints(grid, run("4,1", "4,2", "4,3", "4,4", "4,5"), none)
    expect(out[0]).toEqual(stop)
    expect(back.at(-1)).toEqual(stop)
    out.slice(1).forEach((p, i) => expect(cuts(out[i], p, PREFAB_PILLARS)).toBe(false))
  })

  it("counts a corridor step as one and a room segment by its length", () => {
    expect(stepsBetween({ x: 0, y: 0 }, { x: 500, y: 9 })).toBe(1)
    expect(stepsBetween({ x: 0, y: 0, inRoom: true }, { x: 70, y: 0 })).toBeCloseTo(1)
    expect(stepsBetween({ x: 0, y: 0 }, { x: 0, y: 84, inRoom: true })).toBeCloseTo(1)
    expect(
      walkSteps([
        { x: 0, y: 0 },
        { x: 70, y: 0 },
        { x: 70, y: 168, inRoom: true },
      ])
    ).toBeCloseTo(3)
  })

  it("draws a prefab room's marker at its stop and an absorbed arm's at its door", () => {
    expect(markerCell(grid, ...node)).toEqual(roomStop(grid, ...node))
    expect(markerCell(grid, 4, 5)).toEqual([4, 3])
    expect(markerCell(grid, 4, 7)).toEqual([4, 9])
    expect(markerCell(grid, 5, 6)).toEqual([6, 6])
    expect(markerCell(grid, 4, 1)).toEqual([4, 1])
  })
})

describe("a walk between two doors of a room goes round what stands in its middle", () => {
  // A 3x3 room whose node stands under a pillar in its centre, ways out west and east.
  const centre: Cell = [2, 4]
  const bare = floorFrom(["", "", "E...G...R", "", ""], {
    G: dirs => ({ type: "room", roomType: "fork", dirs: new Set(dirs), state: "fogged" }),
  })
  const grid: FloorGrid = (() => {
    const cells = bare.cells.map(row => [...row])
    cells[2][4] = {
      ...(cells[2][4] as Extract<GridCell, { type: "room" }>),
      prefabRoom: {
        name: "cross",
        layout: 0,
        mirrored: false,
        rect: { top: 1, left: 3, rows: 3, cols: 3 },
        stop: [3, 3],
        objects: [{ kind: "pillar", layer: "floor", top: 2, left: 4, rows: 1, cols: 1 }],
        blocked: ["2,4"],
        doors: [
          [2, 2],
          [2, 6],
        ],
      },
    }
    return { ...bare, cells }
  })()

  it("stays inside the rect and never comes within the centre cell", () => {
    const route: Cell[] = [
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [2, 7],
    ]
    const points = walkPoints(grid, route, none)
    const room = points.filter(p => p.inRoom)
    expect(room.length).toBeGreaterThan(2)
    for (const p of room) {
      expect(p.x).toBeGreaterThanOrEqual(cellCenter(2, 3).cx - 1e-6)
      expect(p.x).toBeLessThanOrEqual(cellCenter(2, 5).cx + 1e-6)
    }
    points.slice(1).forEach((p, i) => expect(cuts(points[i], p, [centre]), `${i}`).toBe(false))
  })
})

// A made-up family with somebody standing in its room.
const ACTOR_FAMILY = "somebody-here"
registerFamily({
  meta: { id: ACTOR_FAMILY, ownerMod: "test", tags: ["puzzle"], icon: "", color: "", rewardPriority: 0, actor: true },
  generate: () => null,
  Component: () => null,
})

describe("a walk through a room fit for somebody", () => {
  it("walks over the actor cell while nobody stands there", () => {
    const grid = fitForkFloor()
    const stop = roomStop(grid, ...PREFAB_FORK)!
    const actor: Cell = [stop[0] - 1, stop[1]]
    const walks = (["w", "e", "s"] as const).flatMap(side =>
      (["w", "e", "s"] as const).map(other =>
        roomPath(grid, PREFAB_FORK, doorOn(grid, PREFAB_FORK, side), doorOn(grid, PREFAB_FORK, other))
      )
    )
    expect(walks.some(walk => walk.slice(1).some((p, i) => cuts(walk[i], p, [actor])))).toBe(true)
  })

  it("the room walk never steps on the actor cell of a room somebody stands in", () => {
    const grid = fitForkFloor({ family: ACTOR_FAMILY })
    const stop = roomStop(grid, ...PREFAB_FORK)!
    const actor: Cell = [stop[0] - 1, stop[1]]
    const cell = grid.cells[PREFAB_FORK[0]][PREFAB_FORK[1]]
    expect(cell.type !== "empty" && cell.prefabRoom?.actor).toEqual(actor)
    const ends: RoomEnd[] = [
      doorOn(grid, PREFAB_FORK, "w"),
      doorOn(grid, PREFAB_FORK, "e"),
      doorOn(grid, PREFAB_FORK, "s"),
      "stop",
    ]
    for (const from of ends)
      for (const to of ends) {
        const walk = roomPath(grid, PREFAB_FORK, from, to)
        walk.slice(1).forEach((p, i) => expect(cuts(walk[i], p, [actor])).toBe(false))
      }
  })
})

describe("a walk through a prefab room whose node stands next to its ring", () => {
  const lChamber = edgePrefabFloor("L")
  const tFork = edgePrefabFloor("T")
  const bones = (grid: FloorGrid, node: Cell) => blockedIn(grid, node)
  const tRoutes = {
    s: run("6,3", "5,3", "4,3"),
    w: run("3,0", "3,1", "3,2"),
    e: run("3,9", "3,8", "3,7", "3,6", "3,5", "3,4"),
  }

  it("never crosses the skeleton and takes no detour via the stop on an L chamber, either way", () => {
    const stop = roomStop(lChamber, ...EDGE_NODE.L)!
    for (const route of [
      run("1,2", "2,2", "3,2", "3,3", "3,4", "3,5", "3,6", "3,7", "3,8"),
      run("3,8", "3,7", "3,6", "3,5", "3,4", "3,3", "3,2", "2,2", "1,2"),
    ]) {
      const points = walkPoints(lChamber, route, none)
      points.slice(1).forEach((p, i) => expect(cuts(points[i], p, bones(lChamber, EDGE_NODE.L)), `${i}`).toBe(false))
      expect(points.some(p => atCentre(p, stop))).toBe(false)
      expect(points.every(p => [1, 2, 3].some(r => p.y === cellCenter(r, 0).cy))).toBe(true)
    }
  })

  it("walks a T fork between any two of its exits without crossing the skeleton or calling at the stop", () => {
    const stop = roomStop(tFork, ...EDGE_NODE.T)!
    for (const [a, into] of Object.entries(tRoutes))
      for (const [b, out] of Object.entries(tRoutes)) {
        if (a === b) continue
        const route = [...into, [3, 3] as [number, number], ...[...out].reverse()]
        const points = walkPoints(tFork, route, none)
        points
          .slice(1)
          .forEach((p, i) => expect(cuts(points[i], p, bones(tFork, EDGE_NODE.T)), `${a}→${b} ${i}`).toBe(false))
        expect(
          points.some(p => atCentre(p, stop)),
          `${a}→${b}`
        ).toBe(false)
      }
  })

  it("walks the T fork's south-to-west turn on the node itself, as a corridor corner", () => {
    const points = walkPoints(tFork, [...tRoutes.s, [3, 3], ...[...tRoutes.w].reverse()], none)
    expect(points.map(p => [p.x, p.y])).toEqual(
      run("6,3", "5,3", "4,3", "3,3", "3,2", "3,1", "3,0").map(([r, c]) => [cellCenter(r, c).cx, cellCenter(r, c).cy])
    )
  })

  it("still sets out from and comes to rest at the stop when the route starts or ends on the node", () => {
    const stop = roomStop(tFork, ...EDGE_NODE.T)!
    expect(atCentre(walkPoints(tFork, [[3, 3], ...[...tRoutes.w].reverse()], none)[0], stop)).toBe(true)
    expect(atCentre(walkPoints(tFork, [...tRoutes.w, [3, 3]], none).at(-1)!, stop)).toBe(true)
  })

  it("leaves a door it stands next to from the node itself, and meets the room at the prefab's stop", () => {
    expect(roomDoors(tFork, ...EDGE_NODE.T).map(door => [door.side, door.inside])).toEqual(
      expect.arrayContaining([
        ["s", [3, 3]],
        ["w", [3, 3]],
        ["e", [3, 6]],
      ])
    )
    expect(roomStop(tFork, ...EDGE_NODE.T)).toEqual([1, 6])
  })
})
