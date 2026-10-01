import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor, ONE_WAY_RUN_CELLS } from "@/game/siteAssembler"
import { oneWayRuns, revealAll } from "@/game/gridNavigation"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { DROP_ART } from "./nodeArt"
import { CELL, COL_PITCH, cellCenter } from "./mapScale"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { tileUrl } from "./tileAssets"
import { AXES, corridorPiece, dropGrid, floorFrom, obstacleIndexes, type Piece } from "./floorFixtures.testing"
// Populates the family registry, as every assembled-floor spec relies on.
import "@/mods/registerModApps"

const dropEastUrl = tileUrl("expert", "dropEast")

const room = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "sumplete",
  dirs: new Set(dirs),
  state: "reachable",
})
const corridor = (dirs: Direction[], state: CellState = "visible"): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
})
const gridOf = (cells: GridCell[][]): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "test",
  staircases: {},
  difficulty: "expert",
})
const dropsIn = (grid: FloorGrid) =>
  nodeSpritesFor(grid, buildRoomClaims(grid), "expert").filter(s => s.key.startsWith("drop:"))

// A drop as the carve lays it: a launch, ONE_WAY_RUN_CELLS obstacle cells, a landing, between two nodes.
// `dropGrid` lays one along any axis; `last` is the obstacle's last cell, where the drop is keyed.
const dropAlong = (travel: Direction, state: CellState = "visible") => {
  const axis = AXES.find(a => a.travel === travel)!
  const { grid, at } = dropGrid(axis, "room", "room", state)
  return { grid: { ...grid, difficulty: "expert" as const }, at, last: at(obstacleIndexes[obstacleIndexes.length - 1]) }
}

// The drop's own cells, in the shape `floorFrom` draws them: a launch naming only its node, an obstacle
// naming nothing, a landing naming only its node.
const onlyToward =
  (dir: Direction): Piece =>
  dirs =>
    corridorPiece(dirs.filter(d => d === dir))
const obstacleOf =
  (dir: Direction): Piece =>
  () => ({ type: "corridor", dirs: new Set<Direction>(), state: "fogged", obstacle: { dir, kind: "zipline" } })
const both = {
  L: onlyToward("w"),
  M: obstacleOf("e"),
  T: onlyToward("e"),
  N: onlyToward("n"),
  S: obstacleOf("s"),
  D: onlyToward("s"),
}

describe("a one-way drop draws its art across its obstacle", () => {
  it("has the painted east asset to draw", () => {
    expect(dropEastUrl).toBeTruthy()
  })

  it("draws dropEast unmirrored for an east-going drop, keyed on the obstacle's last cell", () => {
    const { grid, last } = dropAlong("e")
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual([`drop:${last[0]},${last[1]}`])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(false)
  })

  it("draws the same asset mirrored for a west-going drop", () => {
    const { grid, last } = dropAlong("w")
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual([`drop:${last[0]},${last[1]}`])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(true)
  })

  it("draws nothing while the obstacle is still fogged", () => {
    expect(dropsIn(dropAlong("e", "fogged").grid)).toEqual([])
  })
})

describe("a north-south drop draws what it always drew", () => {
  it("declares no vertical art, so the day it is painted this table is where it plugs in", () => {
    expect(DROP_ART.n).toBeNull()
    expect(DROP_ART.s).toBeNull()
  })

  it.each([["north"], ["south"]])("draws no drop sprite for a %s drop, and never a flipped dropEast", name => {
    const { grid } = dropAlong(name === "north" ? "n" : "s")
    expect(oneWayRuns(grid)).toHaveLength(1)
    expect(dropsIn(grid)).toEqual([])
  })
})

describe("a drop is drawn across its whole obstacle", () => {
  it("is as wide as the obstacle's floor (4 cell pitches and a cell), at the tile's own 2:3 frame, with the pit centred on the obstacle", () => {
    expect(ONE_WAY_RUN_CELLS).toBe(5)
    expect(CELL).toBe(56)
    expect(COL_PITCH).toBe(70)
    const { grid, at } = dropAlong("e")
    const [drop] = dropsIn(grid)
    // The obstacle is the five cells after the launch; its middle is the third.
    const [row, first] = at(obstacleIndexes[0])
    const [, middle] = at(obstacleIndexes[2])
    const [, last] = at(obstacleIndexes[4])
    const { cx, cy } = cellCenter(row, middle)
    expect(drop.w).toBe(336)
    expect(drop.h).toBe(504)
    expect(drop.x).toBe(cx - 168)
    expect(drop.x + drop.w!).toBe(cellCenter(row, last).cx + CELL / 2)
    expect(drop.x).toBe(cellCenter(row, first).cx - CELL / 2)
    // The pit's middle (row 137.5 of the tile's 168) lies on the obstacle's middle line, not on its floor line.
    expect(drop.y + (drop.h! * 137.5) / 168).toBeCloseTo(cy, 6)
    expect(drop.y + drop.h!).toBeCloseTo(cy + 91.5, 6)
  })

  it("claims every cell of the obstacle and nothing else it could be drawn over", () => {
    const { grid, at } = dropAlong("e")
    const [drop] = dropsIn(grid)
    for (const i of obstacleIndexes) expect(drop.footprint).toContain(at(i).join(","))
  })

  it.each([["e"], ["w"]] as const)("draws a %s-going drop at that size", travel => {
    const drops = dropsIn(dropAlong(travel).grid)
    expect(drops).toHaveLength(1)
    for (const drop of drops) {
      expect(drop.w).toBe(336)
      expect(drop.h).toBe(504)
    }
  })
})

describe("only an obstacle draws a drop", () => {
  it("draws none for a stub with no direction, a straight run, or a corner", () => {
    // A stub with no direction and no marker is not an obstacle.
    const deadEnd = gridOf([[room(["e"]), corridor([])]])
    const straight = gridOf([[room(["e"]), corridor(["w", "e"]), room(["w"])]])
    const corner = gridOf([
      [room(["s"]), corridor(["w", "s"])],
      [corridor(["n", "w"]), room(["n"])],
    ])
    for (const grid of [deadEnd, straight, corner]) expect(dropsIn(grid)).toEqual([])
  })

  it("draws the east-west drop of a floor holding both kinds and leaves the north-south one drawing nothing", () => {
    const east = `L${"M".repeat(ONE_WAY_RUN_CELLS)}T`
    const grid = revealAll(
      floorFrom([`E.R${east}R`, ".", ".", "R", "N", ...Array<string>(ONE_WAY_RUN_CELLS).fill("S"), "D", "R"], both)
    )
    expect(oneWayRuns(grid).map(run => [run.dir, run.cells.length])).toEqual([
      ["e", ONE_WAY_RUN_CELLS],
      ["s", ONE_WAY_RUN_CELLS],
    ])
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual([`drop:0,${3 + ONE_WAY_RUN_CELLS}`])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(false)
  })
})

describe("no dressing pool can place a drop", () => {
  it("is not a DecorationKind, so a pool cannot name it", () => {
    // @ts-expect-error a drop is placed by the carve's shape and is not furniture
    const kind: DecorationKind = "dropEast"
    expect(kind).toBe("dropEast")
  })

  it("appears in no authored pool and on no assembled room", () => {
    let pools = 0
    let placed = 0
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs)) {
      levels.flat().forEach((floor, i) => {
        for (const pool of [floor.decorations ?? []]) {
          pools++
          for (const kind of pool) expect(kind).not.toMatch(/^drop/)
        }
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells)
          for (const cell of row)
            if (cell.type === "room" && cell.decoration) {
              placed++
              expect(cell.decoration).not.toMatch(/^drop/)
            }
      })
    }
    expect(pools).toBeGreaterThan(0)
    expect(placed).toBeGreaterThan(0)
  }, 60000)
})
