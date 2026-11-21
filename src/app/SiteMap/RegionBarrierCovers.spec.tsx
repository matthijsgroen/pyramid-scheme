// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell, Tileset } from "@/game/siteTypes"
import type { RegionBarrierRealisationMeta } from "@/game/regionBarrierRealisation"
import type { RegionBarrierCover } from "@/game/regionBarrierCover"
import { CELL, FACE_H, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"
import type { RoomClaims } from "./roomClaims"
import { RegionBarrierCovers } from "./RegionBarrierCovers"

afterEach(cleanup)

const state = "reachable" as const
const E: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })
const room = (dirs: Direction[]): GridCell => ({ type: "room", roomType: "encounter", dirs: new Set(dirs), state })

// A dry corridor (1,0) leads into a chamber (1,1) that is the blockage, on along a passage (1,2) into a
// second chamber (1,3). Each chamber claims the floor around it, (1,3) out into the margin past the grid; (2,0) is claimed by a room left dry.
const grid: FloorGrid = {
  siteId: "made-up",
  rows: 3,
  cols: 5,
  entrancePos: [1, 0],
  exitPos: [1, 0],
  staircases: {},
  cells: [
    [E, E, E, E, E],
    [room(["e"]), room(["w", "e"]), corridor(["w", "e"]), room(["w"]), E],
    [E, E, E, E, E],
  ],
}
const claimedBy = new Map([
  ["2,0", "1,0"],
  ["0,1", "1,1"],
  ["2,1", "1,1"],
  ["0,2", "1,3"],
  ["0,3", "1,3"],
  ["2,3", "1,3"],
  ["0,4", "1,3"],
  ["1,4", "1,3"],
  ["2,4", "1,3"],
  ["1,5", "1,3"],
])
const claims: RoomClaims = {
  claimedBy,
  propCandidates: new Map(),
  decorationAt: new Map(),
  decorationCells: new Set(),
  openEdges: new Set(),
  joinedOwners: new Set(),
}
const cover: RegionBarrierCover = {
  region: "vault",
  realisation: "water",
  cells: [{ at: [1, 1], fadeFrom: ["w"] }, { at: [1, 2] }, { at: [1, 3] }],
}

const drawn = () => {
  const { container } = render(
    <RegionBarrierCovers grid={grid} claims={claims} tier="junior" standing={[cover]} leaving={[]} />
  )
  return new Map(
    Array.from(container.querySelectorAll<HTMLElement>("[data-cover-cell]")).map(el => [
      el.getAttribute("data-cover-cell")!,
      el.style,
    ])
  )
}

describe("a covered chamber lies under the cover wall to wall", () => {
  it("covers every floor cell a covered chamber claims, the margin past the grid included, and none a dry room claims", () => {
    expect([...drawn().keys()].sort()).toEqual(
      ["1,1", "1,2", "1,3", "0,1", "2,1", "0,2", "0,3", "2,3", "0,4", "1,4", "2,4", "1,5"].sort()
    )
  })

  it("fills the gap between two cells of one chamber, so the cover is one sheet", () => {
    const cells = drawn()
    expect(cells.get("1,4")!.left).toBe(`${cellLeft(4) - SIDE_W}px`)
    expect(cells.get("1,4")!.width).toBe(`${CELL + SIDE_W}px`)
    expect(cells.get("2,3")!.top).toBe(`${cellTop(2) - WALL_H}px`)
    expect(cells.get("2,3")!.height).toBe(`${CELL + WALL_H}px`)
  })

  it("leaves the wall between two chambers' floor bare", () => {
    const cells = drawn()
    expect(cells.get("0,2")!.left).toBe(`${cellLeft(2)}px`)
    expect(cells.get("0,2")!.width).toBe(`${CELL}px`)
  })
})

describe("a blockage fades in softly, as one sheet over its chamber", () => {
  const blockage = ["0,1", "1,1", "2,1"]

  it("is clear at the dry edge and full a whole cell on", () => {
    for (const key of blockage)
      expect(drawn().get(key)!.maskImage, key).toBe(`linear-gradient(to right, rgba(0, 0, 0, 0), black ${CELL}px)`)
  })

  it("runs one gradient across the chamber, starting at the same edge in every cell of it", () => {
    const cells = drawn()
    const origins = blockage.map(key => {
      const style = cells.get(key)!
      const [x, y] = style.maskPosition.split(" ").map(parseFloat)
      return { x: parseFloat(style.left) + x, y: parseFloat(style.top) + y, size: style.maskSize }
    })
    expect(new Set(origins.map(o => JSON.stringify(o))).size).toBe(1)
    expect(origins[0]).toEqual({
      x: cellLeft(1),
      y: cellTop(0),
      size: `${CELL}px ${cellTop(2) + CELL - cellTop(0)}px`,
    })
  })

  it("lies full past the blockage", () => {
    const cells = drawn()
    for (const key of ["1,2", "1,3", "0,3", "1,4"]) expect(cells.get(key)!.maskImage, key).toBe("")
  })
})

describe("a realisation that declares motion ripples, one that declares none lies still", () => {
  const still: RegionBarrierRealisationMeta = { id: "dust", ownerMod: "made-up", texture: "dust", fallback: "#999" }
  const moving: RegionBarrierRealisationMeta = { ...still, id: "brine", texture: "brine", motion: "ripple" }
  const metas = new Map([still, moving].map(meta => [meta.id, meta]))
  const resolve = (id: string | undefined) => (id ? metas.get(id) : undefined)
  const painted = (_tier: Tileset, name: string): string | undefined => `/made-up/${name}.png`

  const cellsOf = (realisation: string, urlOf = painted) => {
    const { container } = render(
      <RegionBarrierCovers
        grid={grid}
        claims={claims}
        tier="junior"
        standing={[{ ...cover, realisation }]}
        leaving={[]}
        resolve={resolve}
        urlOf={urlOf}
      />
    )
    return Array.from(container.querySelectorAll<HTMLElement>("[data-cover-cell]"))
  }
  const layersOf = (cell: HTMLElement) => Array.from(cell.querySelectorAll<HTMLElement>("[data-ripple-layer]"))

  it("draws two crossing drifting layers in every cell of a rippling cover, clipped to the cell", () => {
    for (const cell of cellsOf("brine")) {
      expect(layersOf(cell).map(el => el.getAttribute("data-ripple-layer"))).toEqual(["base", "cross"])
      expect(cell.style.overflow).toBe("hidden")
      expect(cell.style.backgroundImage).toBe("")
    }
  })

  it("draws no moving layer for a realisation without motion", () => {
    for (const cell of cellsOf("dust")) {
      expect(layersOf(cell)).toEqual([])
      expect(cell.style.backgroundImage).toContain("/made-up/dust.png")
    }
  })

  it("draws no moving layer while the texture is not painted and the flat fill stands in", () => {
    for (const cell of cellsOf("brine", () => undefined)) {
      expect(layersOf(cell)).toEqual([])
      expect(cell.style.backgroundColor).not.toBe("")
    }
  })

  it("keeps the fade on the cell, so both layers fade in together", () => {
    const blockage = cellsOf("brine").find(cell => cell.getAttribute("data-cover-cell") === "1,1")!
    expect(blockage.style.maskImage).toBe(`linear-gradient(to right, rgba(0, 0, 0, 0), black ${CELL}px)`)
    for (const layer of layersOf(blockage)) expect(layer.style.maskImage).toBe("")
  })

  it("drifts each layer by exactly one period of its texture, so the loop closes without a seam", () => {
    for (const cell of cellsOf("brine"))
      for (const layer of layersOf(cell)) {
        const period = layer.style.backgroundSize.split(" ")[0]
        const travel = [layer.style.getPropertyValue("--ripple-x"), layer.style.getPropertyValue("--ripple-y")]
        expect(travel.filter(t => t !== "0px")).toEqual([period])
      }
  })

  it("anchors every layer's texture at the map's origin, so neighbouring cells run on into each other", () => {
    const offset = (at: number, shift: number, period: number) => (((at + shift) % period) + period) % period
    for (const cell of cellsOf("brine"))
      for (const layer of layersOf(cell)) {
        const [bx, by] = layer.style.backgroundPosition.split(" ").map(parseFloat)
        const period = parseFloat(layer.style.backgroundSize)
        expect(offset(parseFloat(cell.style.left) + parseFloat(layer.style.left), bx, period)).toBeCloseTo(0)
        expect(offset(parseFloat(cell.style.top) + parseFloat(layer.style.top), by, period)).toBeCloseTo(0)
      }
  })
})

describe("a shut barrier's ground lies darkened, so it reads as out of reach", () => {
  const still: RegionBarrierRealisationMeta = { id: "dust", ownerMod: "made-up", texture: "dust", fallback: "#999" }
  const moving: RegionBarrierRealisationMeta = { ...still, id: "brine", texture: "brine", motion: "ripple" }
  const metas = new Map([still, moving].map(meta => [meta.id, meta]))
  const resolve = (id: string | undefined) => (id ? metas.get(id) : undefined)
  const painted = (_tier: Tileset, name: string): string | undefined => `/made-up/${name}.png`

  const cellsOf = (realisation: string, leaving = false) => {
    const covers = [{ ...cover, realisation }]
    const { container } = render(
      <RegionBarrierCovers
        grid={grid}
        claims={claims}
        tier="junior"
        standing={leaving ? [] : covers}
        leaving={leaving ? covers : []}
        resolve={resolve}
        urlOf={painted}
      />
    )
    return Array.from(container.querySelectorAll<HTMLElement>("[data-cover-cell]"))
  }
  const washOf = (cell: HTMLElement) => cell.querySelector<HTMLElement>(":scope > [data-shut-wash]")

  it.each(["brine", "dust"])("darkens every covered cell of a %s cover with one black wash", realisation => {
    for (const cell of cellsOf(realisation))
      expect(washOf(cell)?.style.backgroundColor, cell.getAttribute("data-cover-cell")!).toBe("rgba(0, 0, 0, 0.35)")
  })

  it("lies inside the cell, over the ripple, so it takes the cell's fade at the dry edge", () => {
    const blockage = cellsOf("brine").find(cell => cell.getAttribute("data-cover-cell") === "1,1")!
    expect(blockage.lastElementChild).toBe(washOf(blockage))
    expect(washOf(blockage)!.style.maskImage).toBe("")
    expect(blockage.style.maskImage).toBe(`linear-gradient(to right, rgba(0, 0, 0, 0), black ${CELL}px)`)
  })

  it("fades out with the cover when the barrier opens", () => {
    for (const cell of cellsOf("brine", true)) expect(washOf(cell)!.closest("[data-leaving]")).not.toBeNull()
  })
})

describe("a realisation that declares a wall wash shows on the back wall behind it, thinning toward the top", () => {
  const dry: RegionBarrierRealisationMeta = { id: "dust", ownerMod: "made-up", texture: "dust", fallback: "#999" }
  const wet: RegionBarrierRealisationMeta = { ...dry, id: "brine", texture: "brine", motion: "ripple", wallWash: 0.5 }
  const metas = new Map([dry, wet].map(meta => [meta.id, meta]))
  const resolve = (id: string | undefined) => (id ? metas.get(id) : undefined)
  const painted = (_tier: Tileset, name: string): string | undefined => `/made-up/${name}.png`

  const washesOf = (realisation: string, leaving = false) => {
    const covers = [{ ...cover, realisation }]
    const { container } = render(
      <RegionBarrierCovers
        grid={grid}
        claims={claims}
        tier="junior"
        standing={leaving ? [] : covers}
        leaving={leaving ? covers : []}
        resolve={resolve}
        urlOf={painted}
      />
    )
    return new Map(
      Array.from(container.querySelectorAll<HTMLElement>("[data-wall-wash]")).map(el => [
        el.getAttribute("data-wall-wash")!,
        el,
      ])
    )
  }

  it("covers the face standing behind a covered cell, from the cell's top up the face's whole height", () => {
    const wash = washesOf("brine").get("1,2")!
    expect(wash.style.top).toBe(`${cellTop(1) - FACE_H}px`)
    expect(wash.style.height).toBe(`${FACE_H}px`)
    expect(wash.style.left).toBe(`${cellLeft(2) - SIDE_W}px`)
    expect(wash.style.maskImage).toBe("linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0))")
  })

  it("leaves a cell bare whose north side is open floor", () => {
    const washes = washesOf("brine")
    for (const key of ["1,1", "2,1", "1,3", "2,3"]) expect(washes.has(key), key).toBe(false)
  })

  it("leaves every wall dry for a realisation that declares no wash", () => {
    expect(washesOf("dust").size).toBe(0)
  })

  it("ripples with the cover, its texture anchored at the map's origin", () => {
    const wash = washesOf("brine").get("1,2")!
    const layers = Array.from(wash.querySelectorAll<HTMLElement>("[data-ripple-layer]"))
    expect(layers.map(el => el.getAttribute("data-ripple-layer"))).toEqual(["base", "cross"])
    for (const layer of layers) {
      const [bx, by] = layer.style.backgroundPosition.split(" ").map(parseFloat)
      expect(bx).toBe(-parseFloat(wash.style.left))
      expect(by).toBe(-parseFloat(wash.style.top))
    }
  })

  it("fades in sideways with the blockage, from the same edge as the cover below it", () => {
    const wash = washesOf("brine").get("0,1")!
    expect(wash.style.maskImage).toBe(
      `linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0)), linear-gradient(to right, rgba(0, 0, 0, 0), black ${CELL}px)`
    )
    const sideways = parseFloat(wash.style.maskPosition.split(",")[1])
    expect(parseFloat(wash.style.left) + sideways).toBe(cellLeft(1))
  })

  it("fades out with the cover when the barrier opens", () => {
    const wash = washesOf("brine", true).get("1,2")!
    expect(wash.closest("[data-leaving]")).not.toBeNull()
  })
})
