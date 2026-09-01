import { describe, expect, it } from "vitest"
import type { CellState } from "@/game/siteTypes"
import { ALL_STATES, buildTileRegions, faceShadowsToPath, rectsToPath } from "./tileRegions"
import type { FloorAt, OpenBetween, Rect, TileRegions } from "./tileRegions"
import { CELL, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"

// Most cases here are about which rectangle is floor and which is wall, where connectivity is beside
// the point: say everything adjacent is connected.
const allPassable: OpenBetween = () => true
const nothingPassable: OpenBetween = () => false

// A tiny stand-in for the caller's fog/claim rules: floor where listed, stone everywhere else,
// unless a cell is named as an unlit passage.
const gridOf =
  (drawn: Record<string, CellState>, rooms: string[] = [], unlit: string[] = []): FloorAt =>
  (r, c) => {
    const key = `${r},${c}`
    if (unlit.includes(key)) return "unlit"
    const state = drawn[key]
    if (!state) return "stone"
    return { state, kind: rooms.includes(key) ? "room" : "corridor" }
  }

const has = (rects: Rect[], rect: Rect) => rects.some(r => r.every((n, i) => n === rect[i]))

// The rectangles a cell is made of on the stretched pitch.
const square = (r: number, c: number): Rect => [cellLeft(c), cellTop(r), CELL, CELL]
const northGap = (r: number, c: number): Rect => [cellLeft(c), cellTop(r) - WALL_H, CELL, WALL_H]
const westGap = (r: number, c: number): Rect => [cellLeft(c) - SIDE_W, cellTop(r), SIDE_W, CELL]
const corner = (r: number, c: number): Rect => [cellLeft(c) - SIDE_W, cellTop(r) - WALL_H, SIDE_W, WALL_H]

const inAnyState = (groups: Record<CellState, Rect[]>): Rect[] => ALL_STATES.flatMap(s => groups[s])
const allFloor = (regions: TileRegions): Rect[] => [
  ...inAnyState(regions.floorRoom),
  ...inAnyState(regions.floorCorridor),
]
const allWall = (regions: TileRegions): Rect[] => [...inAnyState(regions.wallMass), ...inAnyState(regions.wallFace)]

describe("buildTileRegions — floor", () => {
  it("paints a floor square only where the caller says a cell is drawn", () => {
    const regions = buildTileRegions(1, 3, gridOf({ "0,0": "reachable", "0,1": "visible" }), allPassable)

    expect(has(regions.floorCorridor.reachable, square(0, 0))).toBe(true)
    expect(has(regions.floorCorridor.visible, square(0, 1))).toBe(true)
    expect(has(allFloor(regions), square(0, 2))).toBe(false)
  })

  it("separates room floor from corridor floor, so a chamber reads as its own place", () => {
    const regions = buildTileRegions(1, 2, gridOf({ "0,0": "reachable", "0,1": "reachable" }, ["0,1"]), allPassable)

    expect(has(regions.floorCorridor.reachable, square(0, 0))).toBe(true)
    expect(has(regions.floorRoom.reachable, square(0, 1))).toBe(true)
  })
})

// The gap between two cells is a place, not a boundary: floor when the player can walk through it,
// wall when they cannot. That is what keeps every wall in the map the same size — nothing has to be
// squeezed onto an edge.
describe("buildTileRegions — the gap between two cells", () => {
  it("floors the gap where the way is open", () => {
    const regions = buildTileRegions(2, 1, gridOf({ "0,0": "reachable", "1,0": "reachable" }), allPassable)

    expect(has(allFloor(regions), northGap(1, 0))).toBe(true)
    expect(has(allWall(regions), northGap(1, 0))).toBe(false)
  })

  it("walls the gap between two drawn cells with no way through", () => {
    const regions = buildTileRegions(2, 1, gridOf({ "0,0": "reachable", "1,0": "reachable" }), nothingPassable)

    expect(has(regions.wallFace.reachable, northGap(1, 0))).toBe(true)
    expect(has(allFloor(regions), northGap(1, 0))).toBe(false)
  })

  it("shows a side wall edge-on rather than a face — there is nothing to look at it from", () => {
    const regions = buildTileRegions(1, 2, gridOf({ "0,0": "reachable", "0,1": "reachable" }), nothingPassable)

    expect(has(regions.wallMass.reachable, westGap(0, 1))).toBe(true)
    expect(has(inAnyState(regions.wallFace), westGap(0, 1))).toBe(false)
  })
})

describe("buildTileRegions — walls", () => {
  it("gives every face the same height, whether it fronts stone or another floor", () => {
    const solid = buildTileRegions(2, 1, gridOf({ "1,0": "reachable" }), allPassable)
    const flush = buildTileRegions(2, 1, gridOf({ "0,0": "reachable", "1,0": "reachable" }), nothingPassable)

    const faces = [...inAnyState(solid.wallFace), ...inAnyState(flush.wallFace)]
    expect(faces.length).toBeGreaterThan(1)
    for (const [, , , h] of faces) expect(h).toBe(WALL_H)
  })

  // The artifact this closes: a chamber claims the cells around it, so four floor cells meet at each
  // of its interior corners. Filled with mass they read as four little walls standing in the room.
  it("floors a corner that is inside one space", () => {
    const cells = { "0,0": "reachable", "0,1": "reachable", "1,0": "reachable", "1,1": "reachable" } as const
    const regions = buildTileRegions(2, 2, gridOf(cells, Object.keys(cells)), allPassable)

    expect(has(regions.floorRoom.reachable, corner(1, 1))).toBe(true)
    expect(has(allWall(regions), corner(1, 1))).toBe(false)
  })

  it("keeps a corner as wall where the space is divided", () => {
    const cells = { "0,0": "reachable", "0,1": "reachable", "1,0": "reachable", "1,1": "reachable" } as const
    const regions = buildTileRegions(2, 2, gridOf(cells, Object.keys(cells)), nothingPassable)

    expect(has(allWall(regions), corner(1, 1))).toBe(true)
    expect(has(allFloor(regions), corner(1, 1))).toBe(false)
  })

  // A back wall reaches as far as the room it walls, and no further. Across a room's own width the
  // band runs unbroken through the corners; at the ends, the side wall runs toward the viewer, so it
  // stands in front and its own top takes the corner.
  it("carries the wall band through a corner in the middle of a room", () => {
    const cells = { "1,0": "reachable", "1,1": "reachable" } as const
    const regions = buildTileRegions(2, 2, gridOf(cells, Object.keys(cells)), allPassable)

    expect(has(regions.wallFace.reachable, corner(1, 1))).toBe(true)
    expect(has(inAnyState(regions.wallMass), corner(1, 1))).toBe(false)
  })

  it("lets the side wall in front take the corner at the end of a band", () => {
    const cells = { "1,0": "reachable", "1,1": "reachable" } as const
    const regions = buildTileRegions(2, 3, gridOf(cells, Object.keys(cells)), allPassable)

    // Both ends: west of (1,0) and east of (1,1) are stone, so each end is a side wall's top.
    expect(has(regions.wallMass.reachable, corner(1, 0))).toBe(true)
    expect(has(regions.wallMass.reachable, corner(1, 2))).toBe(true)
    expect(has(inAnyState(regions.wallFace), corner(1, 0))).toBe(false)
  })

  it("fills a stone cell, and the corner where four cells meet, with mass", () => {
    const regions = buildTileRegions(3, 3, gridOf({ "1,1": "reachable" }), allPassable)

    expect(has(regions.wallMass.reachable, square(1, 0))).toBe(true)
    expect(has(regions.wallMass.reachable, square(2, 1))).toBe(true)
    // A corner with no face beside it is mass — this one is south-east of the lit cell, so no wall
    // band runs through it. (The corner at the end of a band is a face; see the case above.)
    expect(has(regions.wallMass.reachable, corner(2, 2))).toBe(true)
  })

  it("draws nothing for stone that touches no drawn cell", () => {
    const regions = buildTileRegions(6, 6, gridOf({ "0,0": "reachable" }), allPassable)

    expect(has(allWall(regions), square(4, 4))).toBe(false)
    // ...but the ring immediately around the lit cell is wall, including one step off-grid.
    expect(has(allWall(regions), square(-1, 0))).toBe(true)
    expect(has(allWall(regions), square(1, 1))).toBe(true)
  })

  // A real passage the player has not reached is not stone. Walling it would tell the player the way
  // ends there; leaving it black is how the map says it carries on.
  it("neither draws nor walls an unlit passage", () => {
    const regions = buildTileRegions(1, 3, gridOf({ "0,0": "reachable" }, [], ["0,1"]), allPassable)

    expect(has(allWall(regions), square(0, 1))).toBe(false)
    expect(has(allFloor(regions), square(0, 1))).toBe(false)
  })

  it("gives a wall the brightest state around it, so the near side of a wall is never dimmed", () => {
    const regions = buildTileRegions(3, 1, gridOf({ "0,0": "visible", "2,0": "reachable" }), allPassable)

    expect(has(regions.wallMass.reachable, square(1, 0))).toBe(true)
    expect(has(regions.wallMass.visible, square(1, 0))).toBe(false)
  })
})

describe("path building", () => {
  it("emits one closed rectangle per entry", () => {
    expect(rectsToPath([[5, 5, 10, 10]])).toBe("M5 5h10v10h-10z")
    expect(rectsToPath([])).toBe("")
  })

  it("puts a face's shadow on the floor in front of it", () => {
    expect(faceShadowsToPath([[0, 0, 10, 6]], 4)).toBe("M0 6h10v4h-10z")
  })
})
