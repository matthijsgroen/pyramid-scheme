import { describe, expect, it } from "vitest"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"
import {
  BEAM_STRENGTH,
  CORRIDOR_SHAFTS,
  LIT_STANDING_STRENGTH,
  LIT_STRENGTH,
  MAX_SHAFTS,
  PENNED_LEAN,
  beamShafts,
  floorNight,
  lampStandingStrength,
  lampStrength,
  litPlaceCells,
  shaftLean,
  shaftStrength,
} from "./lighting"

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

const cellTypeAt = (grid: FloorGrid, key: string) => {
  const [row, col] = key.split(",").map(Number)
  return grid.cells[row]?.[col]?.type
}
const isCorridorCell = (grid: FloorGrid, key: string) => cellTypeAt(grid, key) === "corridor"
const isRoomCell = (grid: FloorGrid, key: string) => cellTypeAt(grid, key) === "room"

/** Two chambers at the foot of a passage long enough to hold several runs — the shape of a real floor,
 * where the corridor cells outnumber the room ones many times over. */
const longRun = (siteId = "run-test") =>
  makeGrid(
    [
      Array.from({ length: 14 }, (_, i) => (i % 7 === 3 ? corridor(["n", "s", "e", "w"]) : corridor(["e", "w"]))),
      Array.from({ length: 14 }, (_, i) => (i % 7 === 3 ? chamber() : empty)),
    ],
    siteId
  )

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

  it("never puts one in a passage on a floor with no daylight of its own", () => {
    // A long run beside one chamber, every roof certain to fail: the passage still gets nothing, because
    // a shaft in a one-cell corridor on an ordinary floor is a thing the player walks through.
    const grid = longRun()
    const rooms = new Set([...buildRoomClaims(grid).claimedBy.values()])
    for (const cell of shaftsOf(grid, 1)) expect(rooms.has(cell) || isRoomCell(grid, cell)).toBe(true)
  })

  it("lights the passages of a floor whose roof has already failed enough to grow plants", () => {
    const grid = longRun()
    const ordinary = shaftsOf(grid, 1)
    const overgrown = beamShafts(grid, buildRoomClaims(grid), 1, grid.siteId, 1)
    expect(overgrown.length).toBeGreaterThan(ordinary.length)
    expect(overgrown.filter(cell => isCorridorCell(grid, cell)).length).toBeGreaterThan(0)
  })

  it("leaves an ordinary floor's shafts exactly where they were, whatever a condition does elsewhere", () => {
    // The chambers keep their own three, in their own cells and their own order: the daylight allowance
    // is added after them and can never displace one.
    const grid = longRun()
    const ordinary = shaftsOf(grid, 1)
    expect(beamShafts(grid, buildRoomClaims(grid), 1, grid.siteId, 1).slice(0, ordinary.length)).toEqual(ordinary)
  })

  it("breaks at most twice as many roofs on a floor thick with daylight", () => {
    const grid = longRun()
    const shafts = beamShafts(grid, buildRoomClaims(grid), 1, grid.siteId, 1)
    expect(shafts.length).toBeLessThanOrEqual(MAX_SHAFTS + CORRIDOR_SHAFTS)
  })

  it("gives a run of passage one shaft and never a second, since one already lights it to the turn", () => {
    const grid = longRun()
    const claims = buildRoomClaims(grid)
    const corridors = beamShafts(grid, claims, 1, grid.siteId, 1).filter(cell => isCorridorCell(grid, cell))
    const lit = new Set<string>()
    for (const cell of corridors) {
      const [row, col] = cell.split(",").map(Number)
      expect(lit.has(cell)).toBe(false)
      for (const key of litPlaceCells(grid, claims, [row, col])) lit.add(key)
    }
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

describe("what a floor's own daylight costs the night and the lamp", () => {
  it("leaves a floor with no condition on it exactly as slice one solved it", () => {
    expect(floorNight()).toBe(1)
    expect(lampStrength()).toBe(LIT_STRENGTH)
    expect(lampStandingStrength()).toBe(LIT_STANDING_STRENGTH)
    expect(shaftStrength()).toBe(BEAM_STRENGTH)
  })

  it("takes the night off the floor and the lamp back with it, together", () => {
    // Both, or the picture breaks one way or the other: a lifted baseline under an untouched lamp takes
    // the lit room past the patch of sun, and a pulled-back lamp over an untouched baseline makes a room
    // darker to walk into than the passage outside it.
    expect(floorNight(1)).toBeLessThan(floorNight(0.5))
    expect(floorNight(0.5)).toBeLessThan(floorNight(0))
    expect(lampStrength(1)).toBeLessThan(lampStrength(0.5))
    expect(shaftStrength(1)).toBeLessThan(shaftStrength(0.5))
  })

  it("keeps some night and some lamp at full growth — a lit place still reads as lit", () => {
    expect(floorNight(1)).toBeGreaterThan(0)
    expect(lampStrength(1)).toBeGreaterThan(0)
  })

  it("brings the shaft down with the lamp, so the two still hand over rather than stacking", () => {
    // `color-dodge` divides, so a shaft and a lamp drawn over each other multiply their scales. They are
    // solved to the same top end at every amount, which is what lets the beam fade out as the lamp fades
    // in without the room changing value.
    const ratio = (d: number) => shaftStrength(d) / lampStrength(d)
    expect(ratio(1)).toBeCloseTo(ratio(0), 10)
  })
})

describe("which way a shaft leans", () => {
  it("throws its patch of sun onto floor, never into the rock beside a one-cell passage", () => {
    // A pool a cell out from a passage walled on both sides lands in the black beside the map, which
    // reads as a light leak off the edge of the world.
    const grid = makeGrid([
      [empty, corridor(["n", "s"]), empty],
      [empty, corridor(["n", "s"]), empty],
    ])
    expect(Math.abs(shaftLean(grid, buildRoomClaims(grid), grid.siteId, "0,1"))).toBe(PENNED_LEAN)
  })

  it("leans a whole cell where there is floor to land on", () => {
    const grid = makeGrid([[corridor(["e", "w"]), corridor(["e", "w"]), corridor(["e", "w"])]])
    expect(Math.abs(shaftLean(grid, buildRoomClaims(grid), grid.siteId, "0,1"))).toBe(1)
  })

  it("stays in the passage where the floor beside it is another room's, across a wall", () => {
    // The floor of a chamber a passage runs past is one cell over and behind masonry: a beam that leaned
    // onto it stood in the corridor with its patch of sun on the far side of the wall.
    const grid = makeGrid([
      [empty, empty, corridor(["s"])],
      [chamber(), empty, corridor(["n", "s"])],
      [empty, empty, corridor(["n"])],
    ])
    const claims = buildRoomClaims(grid)
    expect(claims.claimedBy.has("1,1")).toBe(true)
    expect(Math.abs(shaftLean(grid, claims, grid.siteId, "1,2"))).toBe(PENNED_LEAN)
  })

  it("takes the other side when only that one is floor", () => {
    const grid = makeGrid([[empty, corridor(["e"]), corridor(["w"])]])
    expect(shaftLean(grid, buildRoomClaims(grid), grid.siteId, "0,1")).toBe(1)
  })
})
