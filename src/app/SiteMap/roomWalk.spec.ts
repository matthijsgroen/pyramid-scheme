import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { CELL, cellCenter } from "./mapScale"
import { markerCell, roomPath, roomStop, stepsBetween, walkPoints, walkSteps } from "./roomWalk"
import type { RoomEnd, WalkPoint } from "./roomWalk"

const corridor = (...dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })

// A fork at 2,4 with arms W, E, S, grown to rows 1-4, cols 2-6; a 2x1 stand-in piece at row 2, cols 3-4.
const NODE = [2, 4] as const
const PIECE = { top: 2, left: 3, rows: 1, cols: 2 }
const makeGrid = (): FloorGrid => {
  const placed: Record<string, GridCell> = {
    "2,4": {
      type: "room",
      roomType: "fork",
      dirs: new Set<Direction>(["e", "w", "s"]),
      state: "fogged",
      decoration: "basin",
      grownRoom: { rect: { top: 1, left: 2, rows: 4, cols: 5 }, piece: { kind: "basin", ...PIECE } },
    },
    "2,0": corridor("e", "w"),
    "2,1": corridor("e", "w"),
    "2,2": corridor("e", "w"),
    "2,3": corridor("e", "w"),
    "2,5": corridor("e", "w"),
    "2,6": corridor("e", "w"),
    "2,7": corridor("e", "w"),
    "3,4": corridor("n", "s"),
    "4,4": corridor("n", "s"),
    "5,4": corridor("n", "s"),
  }
  return {
    cells: Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 8 }, (_, c): GridCell => placed[`${r},${c}`] ?? { type: "empty" })
    ),
    rows: 6,
    cols: 8,
    entrancePos: [-9, -9],
    exitPos: [-9, -9],
    siteId: "site",
    staircases: {},
  }
}

const nw = cellCenter(PIECE.top, PIECE.left)
const se = cellCenter(PIECE.top + PIECE.rows - 1, PIECE.left + PIECE.cols - 1)
const box = { x0: nw.cx - CELL / 2, y0: nw.cy - CELL / 2, x1: se.cx + CELL / 2, y1: se.cy + CELL / 2 }
const inside = (p: WalkPoint) => p.x > box.x0 && p.x < box.x1 && p.y > box.y0 && p.y < box.y1
const length = (pts: WalkPoint[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0)
const cutsPiece = (a: WalkPoint, b: WalkPoint) => {
  for (let t = 0; t <= 1; t += 0.01) if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true
  return false
}
const ends: RoomEnd[] = [{ door: "w" }, { door: "e" }, { door: "s" }, "stop"]

describe("roomWalk", () => {
  it("goes straight between two doors on the same side of the piece", () => {
    const path = roomPath(makeGrid(), NODE, { door: "s" }, "stop")
    expect(path).toHaveLength(2)
  })

  it("goes round the near side when the two doors are on opposite sides", () => {
    const path = roomPath(makeGrid(), NODE, { door: "w" }, { door: "e" })
    expect(path.length).toBeGreaterThan(2)
    for (const p of path) {
      expect(inside(p)).toBe(false)
      expect(p.inRoom).toBe(true)
    }
    expect(path.slice(1, -1).every(p => p.y > box.y1)).toBe(true)
  })

  it("takes the shorter way round for every pair of exits", () => {
    const grid = makeGrid()
    const corner = (r: number, c: number): WalkPoint => ({ x: cellCenter(r, c).cx, y: cellCenter(r, c).cy })
    const [north, south] = [PIECE.top - 1, PIECE.top + PIECE.rows].map(row => [
      corner(row, PIECE.left - 1),
      corner(row, PIECE.left + PIECE.cols),
    ])
    for (const a of ends)
      for (const b of ends) {
        const start = roomPath(grid, NODE, a, a)[0]
        const end = roomPath(grid, NODE, b, b)[0]
        const forced = [north, south].map(side => length([start, ...side, end]))
        const forcedBack = [north, south].map(side => length([start, ...[...side].reverse(), end]))
        expect(length(roomPath(grid, NODE, a, b))).toBeLessThanOrEqual(Math.min(...forced, ...forcedBack) + 1e-6)
      }
  })

  it("never crosses the piece", () => {
    const grid = makeGrid()
    for (const a of ends)
      for (const b of ends) {
        const path = roomPath(grid, NODE, a, b)
        path.slice(1).forEach((p, i) => expect(cutsPiece(path[i], p)).toBe(false))
      }
  })

  it("puts the stop south of the piece, on no door", () => {
    const grid = makeGrid()
    const stop = roomStop(grid, 2, 4)
    expect(stop).toEqual([3, 4])
    expect(roomStop(grid, 2, 3)).toBeUndefined()
    expect(roomStop(grid, 0, 0)).toBeUndefined()
  })

  it("leaves a route through no grown room exactly as today's waypoints", () => {
    const grid = makeGrid()
    const route: [number, number][] = [
      [2, 0],
      [2, 1],
      [3, 1],
    ]
    const points = walkPoints(grid, route, (r, c) => (r === 3 && c === 1 ? { dx: 5, dy: -4 } : { dx: 0, dy: 0 }))
    const at = (r: number, c: number) => cellCenter(r, c)
    expect(points).toEqual([
      { x: at(2, 0).cx, y: at(2, 0).cy },
      { x: at(2, 1).cx, y: at(2, 1).cy },
      { x: at(3, 1).cx + 5, y: at(3, 1).cy - 4 },
    ])
  })

  it("replaces a run through a grown room with its path", () => {
    const grid = makeGrid()
    const route: [number, number][] = [
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [2, 7],
    ]
    const points = walkPoints(grid, route, () => ({ dx: 0, dy: 0 }))
    expect(points[0].inRoom).toBeUndefined()
    expect(points.at(-1)?.inRoom).toBeUndefined()
    expect(points.slice(1, -1).every(p => p.inRoom && !inside(p))).toBe(true)
  })

  it("sets out from and comes to rest at the stop when the route starts or ends on an absorbed arm cell", () => {
    const grid = makeGrid()
    const stop = roomPath(grid, NODE, "stop", "stop")[0]
    const none = () => ({ dx: 0, dy: 0 })
    const out = walkPoints(
      grid,
      [
        [2, 3],
        [2, 2],
        [2, 1],
      ],
      none
    )
    const back = walkPoints(
      grid,
      [
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      none
    )
    expect(out[0]).toEqual(stop)
    expect(back.at(-1)).toEqual(stop)
    out.slice(1).forEach((p, i) => expect(cutsPiece(out[i], p)).toBe(false))
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

  it("draws a grown room's marker at its stop and an absorbed arm's at its door", () => {
    const grid = makeGrid()
    expect(markerCell(grid, 2, 4)).toEqual(roomStop(grid, 2, 4))
    expect(markerCell(grid, 2, 3)).toEqual([2, 2])
    expect(markerCell(grid, 2, 5)).toEqual([2, 6])
    expect(markerCell(grid, 3, 4)).toEqual([4, 4])
    expect(markerCell(grid, 2, 1)).toEqual([2, 1])
  })
})
