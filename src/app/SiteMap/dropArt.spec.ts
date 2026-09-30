import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { isOneWayMouth, revealAll } from "@/game/gridNavigation"
import type { CellState, DecorationKind, Direction, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { DROP_ART } from "./nodeArt"
import { ARCH_W, CELL, DROP_H, DROP_W, cellCenter } from "./mapScale"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { tileUrl } from "./tileAssets"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { ALL_CURRENCY_DISTRIBUTIONS } from "@/mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "@/mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "@/mods/allFamilyMeta"
// Populates the family registry, as every assembled-floor spec relies on.
import "@/mods/registerModApps"

const doubleBack = (): FloorGrid => {
  process.env.INCLUDE_DEV = "1"
  const configs = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )
  delete process.env.INCLUDE_DEV
  const floor = configs[DEV_JOURNEY_ID][1][0] as unknown as FloorConfig
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 2, 0)
  const result = assembleFloor(DEV_JOURNEY_ID, floor, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex: 0 },
  })
  if (!result.success) throw new Error("doubleBack did not assemble")
  return result.grid
}

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

  it("draws every drop on doubleBack at that size, both headings", () => {
    const drops = [...dropsIn(revealAll(doubleBack())), ...dropsIn(westGrid())]
    expect(drops.length).toBeGreaterThan(1)
    for (const drop of drops) {
      expect(drop.w).toBe(84)
      expect(drop.h).toBe(126)
    }
  }, 60000)
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

  it("leaves every mouth on doubleBack out of every room's claims", () => {
    const grid = revealAll(doubleBack())
    const claimed = new Set(buildRoomClaims(grid).claimedBy.keys())
    const mouths: string[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) if (isOneWayMouth(grid, r, c)) mouths.push(`${r},${c}`)
    expect(mouths.length).toBeGreaterThan(0)
    for (const mouth of mouths) expect(claimed.has(mouth)).toBe(false)
  }, 60000)

  it("draws doubleBack's east-west drop and leaves its north-south one as it was", () => {
    const grid = revealAll(doubleBack())
    const mouths: string[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) if (isOneWayMouth(grid, r, c)) mouths.push(`${r},${c}`)
    expect(mouths).toEqual(["18,11", "25,12"])
    const drops = dropsIn(grid)
    expect(drops.map(d => d.key)).toEqual(["drop:18,11"])
    expect(drops[0].url).toBe(dropEastUrl)
    expect(drops[0].mirrored).toBe(false)
  }, 60000)
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
