import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor, ONE_WAY_RUN_CELLS } from "@/game/siteAssembler"
import { oneWayRuns, revealAll } from "@/game/gridNavigation"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { DROP_ART } from "./nodeArt"
import {
  CELL,
  COL_PITCH,
  DROP_H,
  DROP_NORTH_H,
  DROP_NORTH_W,
  DROP_SOUTH_H,
  DROP_SOUTH_W,
  DROP_W,
  cellCenter,
} from "./mapScale"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { tileUrl } from "./tileAssets"
import { AXES, corridorPiece, dropGrid, floorFrom, obstacleIndexes, type Piece } from "./floorFixtures.testing"
// Populates the family registry, as every assembled-floor spec relies on.
import "@/mods/registerModApps"

const dropEastUrl = tileUrl("expert", "dropEast")
const dropNorthUrl = tileUrl("expert", "dropNorth")
const dropSouthUrl = tileUrl("expert", "dropSouth")

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

describe("a north-south drop draws its own art", () => {
  it("declares a render of its own for each vertical heading, neither mirrored", () => {
    expect(DROP_ART.n).toEqual({ name: "dropNorth", mirrored: false })
    expect(DROP_ART.s).toEqual({ name: "dropSouth", mirrored: false })
  })

  it.each([
    ["n", dropNorthUrl, DROP_NORTH_W, DROP_NORTH_H],
    ["s", dropSouthUrl, DROP_SOUTH_W, DROP_SOUTH_H],
  ] as const)(
    "draws its own named asset for a %s-going drop, unmirrored, at the size the frame gives it",
    (travel, url, w, h) => {
      const { grid, last } = dropAlong(travel)
      expect(oneWayRuns(grid)).toHaveLength(1)
      const drops = dropsIn(grid)
      expect(drops.map(d => d.key)).toEqual([`drop:${last[0]},${last[1]}`])
      expect(drops[0].url).toBe(url)
      expect(drops[0].url).not.toBe(dropEastUrl)
      expect(drops[0].mirrored).toBe(false)
      expect(drops[0].w).toBe(w)
      expect(drops[0].h).toBe(h)
    }
  )

  it.each([
    ["n", "dropNorth"],
    ["s", "dropSouth"],
  ] as const)("holds exactly the pixels a %s drop shows, none stretched to fill its run", (travel, name) => {
    const [drop] = dropsIn(dropAlong(travel).grid)
    expect(pixelsOf(`src/assets/tiles/expert/${name}.png`)).toEqual({ w: drop.w! * 2, h: drop.h! * 2 })
  })

  it.each([["n"], ["s"]] as const)(
    "is centred on a %s drop's run, in x and down the page, and shorter than it",
    travel => {
      const { grid, at } = dropAlong(travel)
      const [drop] = dropsIn(grid)
      const first = cellCenter(...at(obstacleIndexes[0]))
      const last = cellCenter(...at(obstacleIndexes[obstacleIndexes.length - 1]))
      expect(drop.x! + drop.w! / 2).toBe(first.cx)
      expect(drop.y! + drop.h! / 2).toBe((first.cy + last.cy) / 2)
      expect(drop.h).toBeLessThan(Math.abs(last.cy - first.cy) + CELL)
    }
  )
})

// A PNG's IHDR holds its pixel size at bytes 16-23.
const pixelsOf = (path: string): { w: number; h: number } => {
  const file = readFileSync(path)
  return { w: file.readUInt32BE(16), h: file.readUInt32BE(20) }
}

describe("a drop is drawn at the scale it was painted, inside its obstacle", () => {
  it("is drawn at two pixels to a unit: the tile holds exactly the pixels it shows, none stretched", () => {
    const [drop] = dropsIn(dropAlong("e").grid)
    expect(pixelsOf("src/assets/tiles/expert/dropEast.png")).toEqual({ w: drop.w! * 2, h: drop.h! * 2 })
  })

  it("is narrower than its three-cell obstacle, centred on it, with its bottom edge on the corridor's floor edge", () => {
    expect(ONE_WAY_RUN_CELLS).toBe(3)
    expect(CELL).toBe(56)
    expect(COL_PITCH).toBe(70)
    const { grid, at } = dropAlong("e")
    const [drop] = dropsIn(grid)
    const [row, first] = at(obstacleIndexes[0])
    const [, middle] = at(obstacleIndexes[1])
    const [, last] = at(obstacleIndexes[2])
    const { cx, cy } = cellCenter(row, middle)
    const runLeft = cellCenter(row, first).cx - CELL / 2
    const runRight = cellCenter(row, last).cx + CELL / 2
    expect(runRight - runLeft).toBe(196)
    expect(drop.w).toBeLessThan(runRight - runLeft)
    expect(drop.x! + drop.w! / 2).toBe(cx)
    expect(drop.x).toBeGreaterThanOrEqual(runLeft)
    expect(drop.x! + drop.w!).toBeLessThanOrEqual(runRight)
    expect(drop.y! + drop.h!).toBe(cy + CELL / 2)
    // The corridor floor is the bottom cell of the tile; the rest of the tile stands proud above it.
    expect(drop.h).toBeGreaterThan(CELL)
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
      expect(drop.w).toBe(DROP_W)
      expect(drop.h).toBe(DROP_H)
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

  it("draws the east-west drop and the north-south one of a floor holding both kinds, each its own", () => {
    const east = `L${"M".repeat(ONE_WAY_RUN_CELLS)}T`
    const grid = revealAll(
      floorFrom([`E.R${east}R`, ".", ".", "R", "N", ...Array<string>(ONE_WAY_RUN_CELLS).fill("S"), "D", "R"], both)
    )
    expect(oneWayRuns(grid).map(run => [run.dir, run.cells.length])).toEqual([
      ["e", ONE_WAY_RUN_CELLS],
      ["s", ONE_WAY_RUN_CELLS],
    ])
    const drops = dropsIn(grid)
    expect(drops.map(d => d.url)).toEqual([dropEastUrl, dropSouthUrl])
    expect(drops[0].key).toBe(`drop:0,${3 + ONE_WAY_RUN_CELLS}`)
    expect(drops.every(d => !d.mirrored)).toBe(true)
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
