// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import type { RegionBarrierCover } from "@/game/regionBarrierCover"
import { CELL, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"
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
