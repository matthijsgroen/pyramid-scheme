import { describe, expect, it } from "vitest"
import type { FloorConfig } from "@/game/siteTypes"
import { floorArtUrls, floorTilesets, siteArtUrls } from "./floorArt"
import { MECHANISM_STYLE, mechanismFolders } from "./mechanismStyle"

const floor = (extra: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...extra,
})

const folders = (folder: string) => [`${folder}/a.png`, `${folder}/b.png`, "shared.png"]

describe("floorTilesets", () => {
  it("draws a floor that names no tileset at each tier its rooms were authored at", () => {
    const config = floor({
      difficultiesByIndex: { 1: "expert" },
      sideSections: [
        { pathPuzzles: 1, difficulty: "master", end: "treasure" },
        { pathPuzzles: 1, difficulty: "junior", tileset: "cave", end: "treasure" },
      ],
    })
    expect(floorTilesets(config).sort()).toEqual(["cave", "expert", "junior", "master"])
  })

  it("draws a floor that names a tileset in it, except a path that names its own", () => {
    const config = floor({
      tileset: "cave",
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "master",
          end: "treasure",
          sideSections: [{ pathPuzzles: 1, difficulty: "expert", tileset: "wizard", end: "treasure" }],
        },
      ],
    })
    expect(floorTilesets(config).sort()).toEqual(["cave", "wizard"])
  })
})

describe("floorArtUrls", () => {
  it("is the floor's tileset folders, the shared art and the stand-ins, each url once", () => {
    expect(floorArtUrls(floor(), folders)).toEqual([
      "junior/a.png",
      "junior/b.png",
      "shared.png",
      "default/a.png",
      "default/b.png",
      "placeholder/a.png",
      "placeholder/b.png",
    ])
  })

  it("fetches the mechanism style folders the floor's tilesets draw their pieces in", () => {
    const styleFolders = mechanismFolders(MECHANISM_STYLE.cave)
    expect(floorArtUrls(floor({ tileset: "cave" }), folders)).toEqual(
      expect.arrayContaining(styleFolders.map(folder => `${folder}/a.png`))
    )
  })

  it("lists the floor the player stands on first in a site", () => {
    const site = [floor(), floor({ difficulty: "expert" })]
    expect(siteArtUrls(site, 1, folders)[0]).toBe("expert/a.png")
    expect(siteArtUrls(site, 1, folders)).toContain("junior/a.png")
  })

  it("resolves real files for a real tileset", () => {
    expect(floorArtUrls(floor()).length).toBeGreaterThan(0)
  })
})
