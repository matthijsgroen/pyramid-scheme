// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import type { FloorGrid } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { SHELF_AND_DOOR, plateNamed } from "@/game/testSupport/stoneFixtures"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { sharedTileUrl } from "./tileAssets"
import { PLATE_TILE } from "./plateArt"
import { shapeKindFor } from "./nodeKinds"
import "@/mods/registerModApps"

const lit = revealAll(carveLockFloor(parseLock(SHELF_AND_DOOR, "stones").lock, { weights: "stonePlate" }))
const sprites = (grid: FloorGrid, standingAt?: readonly [number, number]) =>
  nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, new Map(), 0, standingAt)
const spriteAt = (grid: FloorGrid, [r, c]: readonly [number, number], standingAt?: readonly [number, number]) =>
  sprites(grid, standingAt).find(s => s.key === `plate:${r},${c}`)

describe("a plate on the map", () => {
  it("is drawn in the shared art, with its stone while it holds one", () => {
    expect(spriteAt(lit, plateNamed(lit, "shelf"))?.url).toBe(sharedTileUrl(PLATE_TILE.stone))
    expect(spriteAt(lit, plateNamed(lit, "p"))?.url).toBe(sharedTileUrl(PLATE_TILE.raised))
  })

  it("is drawn pressed while the explorer stands on it", () => {
    const p = plateNamed(lit, "p")
    expect(spriteAt(lit, p, p)?.url).toBe(sharedTileUrl(PLATE_TILE.pressed))
  })

  it("is not drawn while its cell is still dark", () => {
    const [pr, pc] = plateNamed(lit, "p")
    const dark: FloorGrid = {
      ...lit,
      cells: lit.cells.map((row, r) =>
        row.map((cell, c) =>
          r === pr && c === pc && cell.type !== "empty" ? { ...cell, state: "fogged" as const } : cell
        )
      ),
    }
    expect(spriteAt(dark, [pr, pc])).toBeUndefined()
  })

  it("is shaped as ground, the home plate and every other alike", () => {
    for (const name of ["p", "shelf"]) {
      const [r, c] = plateNamed(lit, name)
      const cell = lit.cells[r][c]
      expect(cell.type === "room" && shapeKindFor(lit, r, c, cell)).toBe("plate")
    }
  })
})
