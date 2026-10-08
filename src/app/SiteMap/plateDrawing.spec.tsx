// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { SHELF_AND_DOOR, plateNamed } from "@/game/testSupport/stoneFixtures"
import { cellAddress } from "@/game/cellAddress"
import { openDoorsFor, openWaysOut } from "@/game/mechanismDoors"
import { explorerWeight, stoneMoveAt } from "@/game/stonePlay"
import { buildRoomClaims } from "./roomClaims"
import { SiteMapView, nodeSpritesFor } from "./SiteMapView"
import { cellCenter, CELL } from "./mapScale"
import { sharedTileUrl } from "./tileAssets"
import { PLATE_TILE } from "./plateArt"
import { shapeKindFor } from "./nodeKinds"
import "@/mods/registerModApps"

// jsdom has no layout, so the map's scroll-to-explorer has nothing to call; the stub is put back after.
const realScrollTo = Element.prototype.scrollTo
beforeAll(() => {
  Element.prototype.scrollTo = () => {}
})
afterAll(() => {
  Element.prototype.scrollTo = realScrollTo
})

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

  it("keeps its marker where no plate art is drawn, and hides it where the art is", () => {
    // The plate pointing at the record another plate carries; without its pointer play has no stones to read there.
    const [sr, sc] = ["p", "shelf"]
      .map(name => plateNamed(lit, name))
      .find(([r, c]) => {
        const cell = lit.cells[r][c]
        return cell.type === "room" && !cell.mechanism
      })!
    const loose: FloorGrid = {
      ...lit,
      cells: lit.cells.map((row, r) =>
        row.map((cell, c) => {
          if (r !== sr || c !== sc || cell.type !== "room") return cell
          const { worksMechanism: _, ...rest } = cell
          return rest
        })
      ),
    }
    expect(spriteAt(loose, [sr, sc])).toBeUndefined()
    const markerOpacity = (grid: FloorGrid, [r, c]: readonly [number, number]) => {
      const { container } = render(<SiteMapView grid={grid} currentFloor={0} />)
      const { cx, cy } = cellCenter(r, c)
      const marker = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
        el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
      )
      return marker?.querySelector("[data-shape-kind]")?.getAttribute("opacity")
    }
    expect(markerOpacity(lit, [sr, sc])).toBe("0")
    expect(markerOpacity(loose, [sr, sc])).not.toBe("0")
  })

  it("is shaped as ground, the home plate and every other alike", () => {
    for (const name of ["p", "shelf"]) {
      const [r, c] = plateNamed(lit, name)
      const cell = lit.cells[r][c]
      expect(cell.type === "room" && shapeKindFor(lit, r, c, cell)).toBe("plate")
    }
  })
})

describe("a door under the explorer's weight", () => {
  it("draws its leaf swung open while he presses its plate, and shut once he steps off", () => {
    const p = plateNamed(lit, "p")
    const door = lit.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.tags?.includes("gate") ? [[r, c] as const] : []))
    )[0]
    const leaf = (weight?: ReturnType<typeof explorerWeight>) =>
      nodeSpritesFor(lit, buildRoomClaims(lit), "expert", undefined, new Map(), 0, p, weight).find(
        s => s.key === `gate:${door[0]},${door[1]}` || s.key === `wall:${door[0]},${door[1]}`
      )
    expect(leaf(explorerWeight(lit, 0, p, new Map()))?.url).toMatch(/gate-open/)
    expect(leaf(undefined)?.url).not.toMatch(/gate-open/)
  })

  it("draws a way the lever holds open shut while his weight shuts it, and open again once he steps off", () => {
    const grid = revealAll(
      carveLockFloor(
        parseLock("in -[p:empty+L]- out\np plate @in\nshelf plate @in stone\nL toggle @in\nin ?\nout ?", "stones").lock,
        {
          weights: "stonePlate",
          toggle: "handle",
        }
      )
    )
    const lever = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type === "room" && cell.mechanism?.states.length === 2 && !cell.plate
          ? [[r, c, cell.mechanism.states[1]] as const]
          : []
      )
    )[0]
    const thrown = new Map([[cellAddress(grid, 0, lever[0], lever[1])!, lever[2]]])
    const opened = openWaysOut(grid, openDoorsFor(grid, 0, thrown))
    const p = plateNamed(opened, "p")
    const leaf = (weight?: ReturnType<typeof explorerWeight>) =>
      nodeSpritesFor(opened, buildRoomClaims(opened), "expert", undefined, thrown, 0, p, weight).find(s =>
        s.key.startsWith("gate:")
      )
    expect(leaf(undefined)?.url).toMatch(/gate-open/)
    expect(leaf(explorerWeight(opened, 0, p, thrown))?.url).not.toMatch(/gate-open/)
  })
})

describe("a plate and the explorer on the map", () => {
  const spriteEl = (container: HTMLElement, [r, c]: readonly [number, number]) =>
    container.querySelector<HTMLElement>(`[data-node-sprite="plate:${r},${c}"]`)
  const urlOf = (el: HTMLElement | null) => /url\(["']?(.*?)["']?\)/.exec(el?.style.backgroundImage ?? "")?.[1]
  const shelf = plateNamed(lit, "shelf")
  const p = plateNamed(lit, "p")

  it("is drawn under him while he stands on it, never over", () => {
    const { container } = render(<SiteMapView grid={lit} currentFloor={0} explorerPos={p} />)
    const plate = spriteEl(container, p)!
    const explorer = container.querySelector("[data-explorer]")!
    expect(plate.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("is drawn raised, not pressed, while he is still walking to it", () => {
    const { container, rerender } = render(<SiteMapView grid={lit} currentFloor={0} explorerPos={shelf} />)
    rerender(<SiteMapView grid={lit} currentFloor={0} explorerPos={p} />)
    expect(urlOf(spriteEl(container, p))).toBe(sharedTileUrl(PLATE_TILE.raised))
  })

  it("keeps the stone's look under him: a stone presses the plate whoever stands there", () => {
    expect(spriteAt(lit, shelf, shelf)?.url).toBe(sharedTileUrl(PLATE_TILE.stone))
  })

  it("wears no dim once walked, where its marker is kept", () => {
    const loose: FloorGrid = {
      ...lit,
      cells: lit.cells.map((row, r) =>
        row.map((cell, c) => {
          if (cell.type !== "room" || !cell.plate || cell.mechanism) return cell
          const { worksMechanism: _, ...rest } = cell
          return { ...rest, state: "completed" as const }
        })
      ),
    }
    const { container } = render(<SiteMapView grid={loose} currentFloor={0} />)
    const [r, c] = [p, shelf].find(([r, c]) => !(loose.cells[r][c] as RoomCell).mechanism)!
    const { cx, cy } = cellCenter(r, c)
    const marker = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
      el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
    )
    expect(marker?.querySelector("[data-shape-kind]")?.getAttribute("opacity")).toBe("1")
  })

  it("has the explorer drawn with the carrying frames once a stone is in hand", () => {
    const lift = stoneMoveAt(lit, 0, shelf[0], shelf[1], new Map())!
    const frame = (states: Map<string, string>) => {
      const { container, unmount } = render(
        <SiteMapView grid={lit} currentFloor={0} explorerPos={p} mechanismStates={states} />
      )
      const src = container.querySelector("[data-explorer] img")?.getAttribute("src")
      unmount()
      return src
    }
    expect(frame(new Map([[lift.address, lift.state]]))).toMatch(/explorer-carry/)
    expect(frame(new Map())).not.toMatch(/explorer-carry/)
  })
})
