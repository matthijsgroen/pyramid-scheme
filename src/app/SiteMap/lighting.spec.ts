import { describe, expect, it } from "vitest"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"
import { MAX_SHAFTS, beamShafts } from "./lighting"

const empty: GridCell = { type: "empty" }

const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "completed" })

/** A dead-end treasure chamber: the `treasure` tag is what makes it claim the cells around it, and a
 * footprint is what separates a place from a station on the way (`canClaimVoid`). */
const chamber = (state: CellState = "completed", decoration?: DecorationKind): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "treasure-chest",
  tags: ["treasure"],
  dirs: new Set<Direction>(["n"]),
  state,
  ...(decoration ? { decoration } : {}),
})

const makeGrid = (cells: GridCell[][], siteId = "beam-test"): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId,
  staircases: {},
})

/** One chamber at the bottom of a passage, with two cells of corridor running down into it. */
const oneChamber = (state: CellState = "completed", decoration?: DecorationKind, siteId?: string) =>
  makeGrid(
    [
      [empty, corridor(["s"]), empty],
      [empty, corridor(["n", "s"]), empty],
      [empty, chamber(state, decoration), empty],
    ],
    siteId
  )

const shaftsOf = (grid: FloorGrid, chance: number) => beamShafts(grid, buildRoomClaims(grid), chance, grid.siteId)

/** The one chamber's own cell and everything it claims — where a shaft of its own may land. */
const footprintOf = (grid: FloorGrid) => {
  const claims = buildRoomClaims(grid)
  return new Set([...claims.claimedBy.keys(), ...claims.claimedBy.values()])
}

describe("where a shaft of daylight comes down", () => {
  it("lands inside a chamber, never in the passage leading to it", () => {
    const grid = oneChamber()
    expect(shaftsOf(grid, 1)).toHaveLength(1)
    expect(footprintOf(grid)).toContain(shaftsOf(grid, 1)[0])
  })

  it("puts no shaft anywhere on a floor whose rank never breaks its roof", () => {
    expect(shaftsOf(oneChamber(), 0)).toEqual([])
  })

  it("leaves a fogged room dark, so daylight gives away nothing the fog holds back", () => {
    expect(shaftsOf(oneChamber("fogged"), 1)).toEqual([])
  })

  it("gives a room one shaft and never a second", () => {
    // Two chambers, both certain to beam: two shafts, in two different rooms.
    const grid = makeGrid([
      [empty, corridor(["s", "e"]), corridor(["w", "s"]), empty],
      [empty, chamber(), chamber(), empty],
    ])
    const claims = buildRoomClaims(grid)
    const shafts = beamShafts(grid, claims, 1, grid.siteId)
    const owners = shafts.map(cell => claims.claimedBy.get(cell) ?? cell)
    expect(shafts).toHaveLength(2)
    expect(new Set(owners).size).toBe(2)
  })

  it("beams a room holding a statue on chances a bare room misses, and never the other way round", () => {
    // Weighted rather than reserved: the statue rooms are a small share of a floor, so a shaft still
    // lands on bare stone most of the time — but the picture the feature exists for is the lit statue.
    const seeds = Array.from({ length: 200 }, (_, i) => `site-${i}`)
    const beams = (decoration?: DecorationKind) =>
      new Set(
        seeds.filter(siteId => {
          return shaftsOf(oneChamber("completed", decoration, siteId), 0.2).length > 0
        })
      )
    const bare = beams()
    const withStatue = beams("statue")

    expect(withStatue.size).toBeGreaterThan(bare.size)
    expect([...bare].every(siteId => withStatue.has(siteId))).toBe(true)
  })

  it("places the shaft over the room rather than always over its own cell", () => {
    // A second draw over the footprint, so a wide chamber does not always light from one corner.
    const landings = new Set(
      Array.from({ length: 60 }, (_, i) => {
        return shaftsOf(oneChamber("completed", undefined, `site-${i}`), 1)[0]
      })
    )
    expect(landings.size).toBeGreaterThan(1)
  })

  it("keeps the shaft on the floor when the room's footprint reaches off the grid", () => {
    // A chamber against the edge claims the strip beyond it, and a shaft landing there drew its rays and
    // its pool in the black beside the map.
    const grid = makeGrid([
      [corridor(["s"]), empty],
      [chamber(), empty],
    ])
    for (const cell of beamShafts(grid, buildRoomClaims(grid), 1, grid.siteId)) {
      const [row, col] = cell.split(",").map(Number)
      expect([row >= 0, col >= 0, row < grid.rows, col < grid.cols]).toEqual([true, true, true, true])
    }
  })

  it("breaks at most three roofs however many chambers a floor has", () => {
    // Every chamber certain to beam, so only the cap can hold the count down.
    const row = Array.from({ length: 8 }, () => chamber())
    const grid = makeGrid([Array.from({ length: 8 }, () => corridor(["s"])), row])
    expect(shaftsOf(grid, 1).length).toBeLessThanOrEqual(MAX_SHAFTS)
  })

  it("picks which rooms keep their shaft by the draw, not by where they sit on the floor", () => {
    // Taking the first few in cell order would put every shaft in the top-left corner of every map.
    const wide = (siteId: string) =>
      makeGrid([Array.from({ length: 8 }, () => corridor(["s"])), Array.from({ length: 8 }, () => chamber())], siteId)
    const columns = new Set(
      Array.from({ length: 40 }, (_, i) => shaftsOf(wide(`site-${i}`), 1).map(cell => cell.split(",")[1])).flat()
    )
    expect(columns.size).toBeGreaterThan(MAX_SHAFTS)
  })

  it("beams the same rooms every render, and does not move them as the fog lifts", () => {
    const lit = oneChamber()
    const fogged = makeGrid([
      [empty, corridor(["s"]), empty],
      [empty, corridor(["n", "s"]), empty],
      [empty, chamber("fogged"), empty],
    ])
    expect(shaftsOf(lit, 0.5)).toEqual(shaftsOf(lit, 0.5))
    // The same floor with one room still unseen: the rooms that do beam beam in the same cells.
    expect(shaftsOf(fogged, 0.5).every(cell => shaftsOf(lit, 0.5).includes(cell))).toBe(true)
  })
})
