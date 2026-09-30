import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { isOneWayMouth, revealAll } from "@/game/gridNavigation"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { DROP_ART } from "./nodeArt"
import { ARCH_W, CELL, DROP_H, DROP_W, cellCenter } from "./mapScale"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { tileUrl } from "./tileAssets"
import { floorFrom, type Piece } from "./floorFixtures.testing"
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

// A mouth's single direction points at its landing, which is the way the drop travels.
const eastGrid = () => gridOf([[room(["e"]), corridor(["e"]), room(["w"])]])
const westGrid = () => gridOf([[room(["e"]), corridor(["w"]), room(["w"])]])
const northGrid = () => gridOf([[room(["s"])], [corridor(["n"])], [room(["n"])]])
const southGrid = () => gridOf([[room(["s"])], [corridor(["s"])], [room(["n"])]])

// A mouth carries one direction, toward its landing; the landing carries none back.
const mouthToward =
  (dir: Direction): Piece =>
  () => ({ type: "corridor", dirs: new Set<Direction>([dir]), state: "fogged" })
const landing: Piece = () => ({ type: "corridor", dirs: new Set<Direction>(), state: "fogged" })
const both = { M: mouthToward("e"), S: mouthToward("s"), T: landing }

describe("a one-way drop draws its art on the mouth", () => {
  it("has the painted east asset to draw", () => {
    expect(dropEastUrl).toBeTruthy()
  })

  it("draws dropEast unmirrored for an east-going mouth, on the mouth's own cell", () => {
    const grid = eastGrid()
    expect(isOneWayMouth(grid, 0, 1)).toBe(true)
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual(["drop:0,1"])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(false)
  })

  it("draws the same asset mirrored for a west-going mouth", () => {
    const grid = westGrid()
    expect(isOneWayMouth(grid, 0, 1)).toBe(true)
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual(["drop:0,1"])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(true)
  })

  it("draws nothing while the mouth is still fogged", () => {
    const grid = gridOf([[room(["e"]), corridor(["e"], "fogged"), room(["w"])]])
    expect(dropsIn(grid)).toEqual([])
  })
})

describe("a north-south drop draws what it always drew", () => {
  it("declares no vertical art, so the day it is painted this table is where it plugs in", () => {
    expect(DROP_ART.n).toBeNull()
    expect(DROP_ART.s).toBeNull()
  })

  it.each([
    ["north", northGrid()],
    ["south", southGrid()],
  ])("draws no drop sprite for a %s mouth, and never a flipped dropEast", (_name, grid) => {
    expect(isOneWayMouth(grid, 1, 0)).toBe(true)
    expect(dropsIn(grid)).toEqual([])
  })
})

describe("a drop is drawn at architecture scale", () => {
  it("is as wide as an archway, at the tile's own 2:3 frame, standing on the mouth's floor line", () => {
    expect(DROP_W).toBe(84)
    expect(DROP_H).toBe(126)
    expect(DROP_W).toBe(ARCH_W)
    const grid = eastGrid()
    const [drop] = dropsIn(grid)
    const { cx, cy } = cellCenter(0, 1)
    expect(drop.w).toBe(84)
    expect(drop.h).toBe(126)
    expect(drop.x).toBe(cx - 42)
    expect(drop.y + drop.h!).toBe(cy + CELL / 2)
  })

  it.each([
    ["east", eastGrid()],
    ["west", westGrid()],
  ])("draws a %s mouth at that size", (_name, grid) => {
    const drops = dropsIn(grid)
    expect(drops).toHaveLength(1)
    for (const drop of drops) {
      expect(drop.w).toBe(84)
      expect(drop.h).toBe(126)
    }
  })
})

describe("only a one-way mouth draws a drop", () => {
  it("draws none for a stub with no direction, a straight run, or a corner", () => {
    // A stub with no direction at all is not a mouth.
    const deadEnd = gridOf([[room(["e"]), corridor([])]])
    const straight = gridOf([[room(["e"]), corridor(["w", "e"]), room(["w"])]])
    const corner = gridOf([
      [room(["s"]), corridor(["w", "s"])],
      [corridor(["n", "w"]), room(["n"])],
    ])
    for (const grid of [deadEnd, straight, corner]) expect(dropsIn(grid)).toEqual([])
  })

  const mouthsOf = (grid: FloorGrid) => {
    const mouths: string[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) if (isOneWayMouth(grid, r, c)) mouths.push(`${r},${c}`)
    return mouths
  }

  // Whether a one-way mouth stays out of every room's claims is asserted in oneWayDeparture.spec.ts,
  // where a fork — the room type that claims every neighbour it can — stands on either side of it, and
  // a control proves the fork still claims the void around it.

  it("draws the east-west drop of a floor holding both kinds and leaves the north-south one drawing nothing", () => {
    const grid = revealAll(floorFrom(["E.RMT", ".", ".", "R", "S", "T"], both))
    expect(mouthsOf(grid)).toEqual(["0,3", "4,0"])
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual(["drop:0,3"])
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
