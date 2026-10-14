// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import { stonesAt } from "@/game/stonePlay"
import type { FloorGrid } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { PIPE_BINDING, PIPED, holeIn } from "@/game/testSupport/stoneFixtures"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { cellTop, WALL_H } from "./mapScale"
import { PIPE_HOLE_PLACEHOLDER, PIPE_HOLE_TILE, pipeHoleArtUrl } from "./pipeHoleArt"
import { sharedTileUrl } from "./tileAssets"
import "@/mods/registerModApps"

const lit = revealAll(carveLockFloor(parseLock(PIPED, "stones").lock, PIPE_BINDING))
const spriteAt = (grid: FloorGrid, [r, c]: readonly [number, number], states = new Map<string, string>()) =>
  nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, states, 0).find(s => s.key === `pipeHole:${r},${c}`)

describe("a pipe's hole on the map", () => {
  it("draws its placeholder in both looks until the painting lands", () => {
    for (const look of ["empty", "stone"] as const)
      expect(pipeHoleArtUrl(look)).toBe(sharedTileUrl(PIPE_HOLE_TILE[look]) ?? PIPE_HOLE_PLACEHOLDER[look])
    expect(PIPE_HOLE_PLACEHOLDER.empty).not.toBe(PIPE_HOLE_PLACEHOLDER.stone)
  })

  it("is drawn on its node's back wall, empty, and with the stone once one lies in it", () => {
    const far = holeIn(lit, "hall")
    expect(spriteAt(lit, far)).toMatchObject({ url: pipeHoleArtUrl("empty"), y: cellTop(far[0]) - WALL_H, h: WALL_H })
    const { address } = stonesAt(lit, 0, far[0], far[1], new Map())!
    expect(spriteAt(lit, far, new Map([[address, "stones.P@stones.hall"]]))?.url).toBe(pipeHoleArtUrl("stone"))
  })
})
