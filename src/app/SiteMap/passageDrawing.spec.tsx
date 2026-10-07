// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import type { Direction, FloorGrid, RoomCell } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { CRACK, PASSAGE_BINDING, passageAt } from "@/game/testSupport/stoneFixtures"
import { passageArtUrl, passageTile } from "./passageArt"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor, SiteMapView } from "./SiteMapView"
import { cellCenter, CELL } from "./mapScale"
import { sharedTileUrl } from "./tileAssets"
import "@/mods/registerModApps"

const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const crack = (dirs: Direction[], realisation = "narrowPassage"): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: "obstacle:spec#0#0:crack",
  passage: { realisation },
})

describe("a passage's tile", () => {
  it.each([
    [["n", "s"], "narrowAcross"],
    [["e", "w"], "narrowAlong"],
    [["e", "s"], "narrowAcross"],
    [["n", "w"], "narrowAcross"],
  ] as const)("for ways %j is %s", (dirs, tile) => {
    expect(passageTile(crack([...dirs]))).toBe(tile)
  })

  it("is none for a passage no registered mod declares", () => {
    expect(passageTile(crack(["n", "s"], "lava"))).toBeUndefined()
  })

  it("is the shared painting, the same at every rank", () => {
    expect(passageArtUrl(crack(["n", "s"]))).toBe(sharedTileUrl("narrowAcross"))
  })
})

describe("a passage on the map", () => {
  const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
  const [r, c] = passageAt(grid)
  const sprites = nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, new Map(), 0)

  it("is drawn as its wall, in its own cell, and as no gate's leaf", () => {
    const wall = sprites.find(sprite => sprite.key === `passage:${r},${c}`)
    expect(wall?.url).toBe(passageArtUrl(grid.cells[r][c] as RoomCell))
    expect(sprites.filter(sprite => sprite.key === `gate:${r},${c}` || sprite.key === `wall:${r},${c}`)).toEqual([])
  })

  it("fades while the explorer stands behind it", () => {
    expect(sprites.find(sprite => sprite.key === `passage:${r},${c}`)?.fadeAt).toEqual([`${r},${c}`, `${r - 1},${c}`])
  })
})

describe("a passage no registered mod paints", () => {
  const painted = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
  const [r, c] = passageAt(painted)
  const grid: FloorGrid = {
    ...painted,
    cells: painted.cells.map((row, ri) =>
      row.map((cell, ci) =>
        ri === r && ci === c && cell.type === "room" ? { ...cell, passage: { realisation: "lava" } } : cell
      )
    ),
  }
  const sprites = nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, new Map(), 0)

  it("is drawn as the shut gate it is to the walk", () => {
    expect(sprites.map(sprite => sprite.key)).toContain(`wall:${r},${c}`)
    expect(sprites.map(sprite => sprite.key)).not.toContain(`passage:${r},${c}`)
  })
})

describe("a passage's cell", () => {
  it("shows no node marker: the wall is the node", () => {
    const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
    const [r, c] = passageAt(grid)
    const { container } = render(<SiteMapView grid={grid} currentFloor={0} />)
    const { cx, cy } = cellCenter(r, c)
    const marker = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
      el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
    )
    const shapes = Array.from(marker?.querySelectorAll("[data-shape-kind]") ?? [])
    expect(shapes.filter(shape => shape.getAttribute("opacity") !== "0")).toEqual([])
  })
})
