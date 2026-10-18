import { describe, expect, it } from "vitest"
import { nodeSpritesFor } from "@/app/SiteMap/SiteMapView"
import { buildRoomClaims } from "@/app/SiteMap/roomClaims"
import { getRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { tileUrl } from "@/app/SiteMap/tileAssets"
import { webMarkFor } from "@/game/mark"
import type { CellState, FloorGrid, GridCell, TreasureReward } from "@/game/siteTypes"
import "./plugin"
import { FLOOR_LEVER_TILES, SAND_LEVER_TILES, WEB_KEY_TILE, owedWebTiles, webActivatorArt } from "./webArt"

const reward = (look: "lever" | "key"): TreasureReward => ({ type: "webActivator", name: "moon", look, pots: ["sun"] })

const treasureGrid = (look: "lever" | "key", state: CellState): FloorGrid => {
  const cells: GridCell[][] = [
    [
      { type: "room", roomType: "encounter", family: "sumplete", dirs: new Set(["e"]), state: "completed" },
      {
        type: "room",
        roomType: "encounter",
        family: "treasure-chest",
        tags: ["treasure"],
        dirs: new Set(["w"]),
        state,
        reward: reward(look),
      },
    ],
  ]
  return {
    cells,
    rows: 1,
    cols: 2,
    entrancePos: [0, 0],
    exitPos: [0, 1],
    siteId: "test",
    staircases: {},
    difficulty: "expert",
  }
}

const spriteOf = (look: "lever" | "key", state: CellState) => {
  const grid = treasureGrid(look, state)
  return nodeSpritesFor(grid, buildRoomClaims(grid), "expert").find(s => s.key.endsWith(":0,1"))
}

describe("the sand lever's drawing", () => {
  it("is not the floor lever's: not one of its three tiles is shared", () => {
    for (const piece of ["back", "arm", "front"] as const)
      expect(SAND_LEVER_TILES[piece]).not.toBe(FLOOR_LEVER_TILES[piece])
  })

  it("is flagged owed while its own tiles are unpainted, and then stands as the floor lever", () => {
    const painted = (tile: string) => tileUrl("expert", tile) !== undefined
    expect(owedWebTiles(painted)).toEqual(expect.arrayContaining([...Object.values(SAND_LEVER_TILES), WEB_KEY_TILE]))
    const sprite = spriteOf("lever", "reachable")!
    expect(sprite.key).toBe("webLever:0,1")
    expect(sprite.armStack?.armUrl).toBe(tileUrl("expert", FLOOR_LEVER_TILES.arm))
  })

  it("is set until the reward is taken, then pulled for good", () => {
    expect(spriteOf("lever", "reachable")!.armStack?.angleDeg).toBe(0)
    expect(spriteOf("lever", "completed")!.armStack?.angleDeg).not.toBe(0)
  })

  it("wears the mark of its pot, and the web key the mark its door asks for", () => {
    expect(spriteOf("lever", "reachable")!.mark).toEqual(webMarkFor("sun"))
    const key = spriteOf("key", "reachable")!
    expect(key.key).toBe("webKey:0,1")
    expect(key.mark).toEqual(webMarkFor("moon"))
  })
})

describe("a web activator is drawn from its look", () => {
  it("reads a lever as the sand lever and a key as the web key, through the reward handler", () => {
    const art = getRewardHandler("webActivator")!.art!
    expect(art(reward("lever"))).toMatchObject({ kind: "lever", tiles: SAND_LEVER_TILES })
    expect(art(reward("key"))).toMatchObject({ kind: "prop", tile: WEB_KEY_TILE })
    expect(webActivatorArt({ name: "moon", look: "key", pots: [] }).mark).toEqual(webMarkFor("moon"))
  })
})
