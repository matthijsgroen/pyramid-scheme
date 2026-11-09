// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { fadedRuns, onFadedRun, walkCells } from "./wallFades"
import { OCCLUDER_FADE } from "./htmlLayers"
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

  it("fades a thing standing on a faded wall with it, and nothing standing elsewhere", () => {
    const runs = [run("a", ["0,0"], [0, 0, 100, 50])]
    const faded = new Set(["a"])

    expect(onFadedRun(runs, faded, [10, 40, 20, 40])).toBe(true)
    expect(onFadedRun(runs, faded, [10, 60, 20, 40])).toBe(false)
    expect(onFadedRun(runs, new Set(), [10, 40, 20, 40])).toBe(false)
  })
})
