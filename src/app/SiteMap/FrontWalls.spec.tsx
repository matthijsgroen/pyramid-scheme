// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { fadedRuns, onFadedRun, walkCells, wallsBehind } from "./wallFades"
import { OCCLUDER_FADE } from "./htmlLayers"
import { FACE_GROW } from "./mapScale"
import type { FrontRun } from "./tileRegions"

Element.prototype.scrollTo = vi.fn()

const corridor = (dirs: Direction[], state: CellState = "reachable"): GridCell => ({
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
  siteId: "front-walls",
  staircases: {},
})

// Two corridors, one right above the other, with a wall between them: the lower one's back wall rises in
// front of the upper one. They join at the west end, so both are one floor.
const behindAWall = () =>
  gridOf([
    [corridor(["e", "s"]), corridor(["w", "e"]), corridor(["w"])],
    [corridor(["n", "e"]), corridor(["w", "e"]), corridor(["w"])],
  ])

const frontWalls = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>("[data-front-wall]"))
const drawnWalls = (container: HTMLElement) =>
  frontWalls(container).filter(wall => wall.querySelectorAll("[data-front-piece]").length > 0)

describe("a wall standing in front of floor", () => {
  it("is drawn over the floor behind it wherever floor lies north of a wall", () => {
    const { container } = render(<SiteMapView grid={behindAWall()} explorerPos={[1, 2]} revealAllCells />)

    expect(drawnWalls(container).length).toBeGreaterThan(0)
  })

  it("is not drawn in front of anything where only stone lies north of the wall", () => {
    const { container } = render(
      <SiteMapView grid={gridOf([[corridor(["e"]), corridor(["w"])]])} explorerPos={[0, 0]} revealAllCells />
    )

    expect(frontWalls(container)).toEqual([])
  })

  it("fades, whole, while the explorer stands on a cell it rises over", () => {
    const { container } = render(<SiteMapView grid={behindAWall()} explorerPos={[0, 2]} revealAllCells />)
    const faded = frontWalls(container).filter(wall => wall.hasAttribute("data-faded"))

    expect(faded).toHaveLength(1)
    expect(Number(faded[0].style.opacity)).toBe(OCCLUDER_FADE)
  })

  it("stays solid while the explorer stands in front of it", () => {
    const { container } = render(<SiteMapView grid={behindAWall()} explorerPos={[1, 2]} revealAllCells />)

    expect(frontWalls(container).filter(wall => wall.hasAttribute("data-faded"))).toEqual([])
    for (const wall of frontWalls(container)) expect(Number(wall.style.opacity)).toBe(1)
  })
})

// The same two corridors, with a chest standing in the upper one, behind the lower one's wall.
const chestBehindAWall = () =>
  gridOf([
    [
      corridor(["e", "s"]),
      {
        type: "room",
        roomType: "encounter",
        family: "tableau",
        tags: ["treasure"],
        dirs: new Set<Direction>(["w", "e"]),
        state: "reachable",
        reward: { type: "money", amount: 10 },
      },
      corridor(["w"]),
    ],
    [corridor(["n", "e"]), corridor(["w", "e"]), corridor(["w"])],
  ])

const layersOf = (behind: Element | null | undefined) => {
  if (!behind) throw new Error("nothing is drawn behind a wall")
  const [clear, ...underWalls] = Array.from(behind.querySelectorAll<HTMLElement>(":scope > div"))
  return { clear, underWall: underWalls[0].firstElementChild as HTMLElement }
}

const chestLayers = (container: HTMLElement) =>
  layersOf(
    Array.from(container.querySelectorAll("[data-behind-wall]")).find(b => b.querySelector("[data-node-sprite]"))
  )

const markerAt = (container: HTMLElement, at: string) =>
  container.querySelector<HTMLElement>(`[data-marker-at="${at}"]`)!

describe("something standing behind a wall", () => {
  it("is cut where the wall stands in front of it, so the wall shows there", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[1, 2]} revealAllCells />)
    const { clear, underWall } = chestLayers(container)

    expect(clear.style.clipPath).toMatch(/^path\(evenodd,/)
    expect(clear.querySelector("[data-node-sprite]")).not.toBeNull()
    expect(Number(underWall.style.opacity)).toBe(0)
  })

  it("shows whole over the wall while that wall is faded", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[0, 2]} revealAllCells />)

    expect(Number(chestLayers(container).underWall.style.opacity)).toBe(1)
  })

  it("leaves the explorer out of it", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[0, 2]} revealAllCells />)

    for (const behind of container.querySelectorAll("[data-behind-wall]"))
      expect(behind.querySelector("[data-explorer]")).toBeNull()
  })
})

describe("a marker behind a wall", () => {
  it("is cut where the wall stands in front of it", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[1, 2]} revealAllCells />)
    const { clear, underWall } = layersOf(markerAt(container, "0,1").querySelector("[data-behind-wall]"))

    expect(clear.style.clipPath).toMatch(/^path\(evenodd,/)
    expect(clear.querySelector("[data-shape-kind]")).not.toBeNull()
    expect(Number(underWall.style.opacity)).toBe(0)
  })

  it("shows whole over the wall while that wall is faded", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[0, 2]} revealAllCells />)
    const { underWall } = layersOf(markerAt(container, "0,1").querySelector("[data-behind-wall]"))

    expect(Number(underWall.style.opacity)).toBe(1)
  })

  it("is still tapped through the wall, on its own box", () => {
    const onCellClick = vi.fn()
    const { container } = render(
      <SiteMapView grid={chestBehindAWall()} explorerPos={[1, 2]} revealAllCells onCellClick={onCellClick} />
    )
    const marker = markerAt(container, "0,1")

    expect(container.querySelectorAll('[data-marker-at="0,1"]')).toHaveLength(1)
    expect(marker.style.pointerEvents).toBe("auto")
    for (const layer of marker.querySelectorAll<HTMLElement>("[data-behind-wall]"))
      expect(layer.parentElement!.style.pointerEvents).toBe("none")
    marker.click()
    expect(onCellClick).toHaveBeenCalledWith(0, 1)
  })

  it("is drawn over the wall it stands in front of", () => {
    const { container } = render(<SiteMapView grid={chestBehindAWall()} explorerPos={[0, 2]} revealAllCells />)

    const inFront = container.querySelectorAll('[data-marker-at^="1,"]')

    expect(inFront.length).toBeGreaterThan(0)
    for (const marker of inFront) expect(marker.querySelector("[data-behind-wall]")).toBeNull()
  })
})

// A passage along row 0, right behind the north wall of a chamber at (2, 2), entered through a doorway
// in that wall.
const archBehindAWall = () => {
  const empty: GridCell = { type: "empty" }
  return gridOf([
    [corridor(["e"]), corridor(["w", "e"]), corridor(["w", "e", "s"]), corridor(["w", "e"]), corridor(["w"])],
    [empty, empty, corridor(["n", "s"]), empty, empty],
    [
      empty,
      empty,
      { type: "room", roomType: "fork", dirs: new Set<Direction>(["n"]), state: "reachable" },
      empty,
      empty,
    ],
    [empty, empty, empty, empty, empty],
  ])
}

describe("an arch in a wall standing in front of floor", () => {
  const archOf = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-arch]")!

  it("has the wall rise over it, as one run with the wall either side", () => {
    const { container } = render(<SiteMapView grid={archBehindAWall()} explorerPos={[2, 2]} revealAllCells />)
    const pieces = drawnWalls(container).flatMap(wall =>
      Array.from(wall.querySelectorAll<HTMLElement>("[data-front-piece]"))
    )

    expect(drawnWalls(container)).toHaveLength(1)
    expect(pieces.some(piece => parseFloat(piece.style.height) === FACE_GROW)).toBe(true)
  })

  it("leaves a doorway in a tier with no arch art an opening, with no wall over it", () => {
    const { container } = render(
      <SiteMapView grid={{ ...archBehindAWall(), tileset: "cave" }} explorerPos={[2, 2]} revealAllCells />
    )
    const pieces = drawnWalls(container).flatMap(wall =>
      Array.from(wall.querySelectorAll<HTMLElement>("[data-front-piece]"))
    )

    expect(container.querySelector("[data-arch]")).toBeNull()
    expect(pieces.some(piece => parseFloat(piece.style.height) === FACE_GROW)).toBe(false)
  })

  it("fades with that wall", () => {
    const solid = render(<SiteMapView grid={archBehindAWall()} explorerPos={[2, 2]} revealAllCells />)
    expect(Number(archOf(solid.container).style.opacity)).toBe(1)
    solid.unmount()

    const { container } = render(<SiteMapView grid={archBehindAWall()} explorerPos={[0, 3]} revealAllCells />)
    expect(Number(archOf(container).style.opacity)).toBe(OCCLUDER_FADE)
  })

  it("fades its wall while the explorer stands on the cell the wall over the arch rises over", () => {
    const { container } = render(<SiteMapView grid={archBehindAWall()} explorerPos={[0, 2]} revealAllCells />)

    expect(drawnWalls(container).filter(wall => wall.hasAttribute("data-faded"))).toHaveLength(1)
  })

  it("leaves its wall solid while the explorer stands in the doorway", () => {
    const { container } = render(<SiteMapView grid={archBehindAWall()} explorerPos={[1, 2]} revealAllCells />)

    expect(drawnWalls(container).filter(wall => wall.hasAttribute("data-faded"))).toEqual([])
  })
})

const run = (key: string, behind: string[], bounds: FrontRun["bounds"] = [0, 0, 10, 10]): FrontRun => ({
  key,
  pieces: [],
  bounds,
  behind: new Set(behind),
})

describe("which walls are out of the way", () => {
  it("clears every run the explorer is behind, and only those", () => {
    const runs = [run("a", ["0,1", "0,2"]), run("b", ["4,1"])]

    expect([...fadedRuns(runs, ["0,2"])]).toEqual(["a"])
    expect([...fadedRuns(runs, ["2,2"])]).toEqual([])
  })

  it("counts every cell of a straight walk, so a wall clears for the whole crossing", () => {
    expect(walkCells([2, 0], [2, 3])).toEqual(["2,0", "2,1", "2,2", "2,3"])
    expect(walkCells([3, 1], [1, 1])).toEqual(["3,1", "2,1", "1,1"])
  })

  it("counts the two ends of a walk that turns, and the one cell of someone standing still", () => {
    expect(walkCells([0, 0], [2, 3])).toEqual(["0,0", "2,3"])
    expect(walkCells([1, 1], [1, 1])).toEqual(["1,1"])
  })

  it("puts a thing standing further back than a wall's foot behind it, and nothing at or before its foot", () => {
    const runs = [run("a", ["0,0"], [0, 0, 100, 50])]

    expect(wallsBehind(runs, [10, -20, 20, 40], 20)).toEqual(runs)
    expect(wallsBehind(runs, [10, 10, 20, 40], 50)).toEqual([])
    expect(wallsBehind(runs, [200, -20, 20, 40], 20)).toEqual([])
  })

  it("fades a thing standing on a faded wall with it, and nothing standing elsewhere", () => {
    const runs = [run("a", ["0,0"], [0, 0, 100, 50])]
    const faded = new Set(["a"])

    expect(onFadedRun(runs, faded, [10, 40, 20, 40])).toBe(true)
    expect(onFadedRun(runs, faded, [10, 60, 20, 40])).toBe(false)
    expect(onFadedRun(runs, new Set(), [10, 40, 20, 40])).toBe(false)
  })
})
