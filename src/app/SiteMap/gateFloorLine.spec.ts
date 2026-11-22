import { describe, expect, it } from "vitest"
import { nodeSpritesFor } from "./SiteMapView"
import { buildRoomClaims } from "./roomClaims"
import { CELL, PROP_H, WALL_H, cellTop } from "./mapScale"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import "@/mods/registerModApps"

const corridor = (dirs: Direction[]): GridCell =>
  ({ type: "corridor", dirs: new Set(dirs), state: "completed" }) as GridCell
const gate: GridCell = {
  type: "room",
  roomType: "encounter",
  tags: ["gate"],
  requiredKeyId: "switch:test:s1",
  dirs: new Set<Direction>(["n", "s"]),
  state: "reachable",
}
const empty = { type: "empty" } as GridCell

const floorOf = (cells: GridCell[][], entrancePos: readonly [number, number]): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [entrancePos[0], entrancePos[1]],
  exitPos: [entrancePos[0], entrancePos[1]],
  siteId: "test",
  staircases: {},
})

const feetOf = (grid: FloorGrid, key: string): number | undefined => {
  const leaf = nodeSpritesFor(grid, buildRoomClaims(grid), "junior").find(sprite => sprite.key === key)
  return leaf && leaf.y + PROP_H
}

describe("a gate's feet", () => {
  it("stand on its own cell's south floor line in a plain corridor sealed to the south", () => {
    const grid = floorOf([[corridor(["s"])], [corridor(["n", "s"])], [gate], [corridor(["n"])]], [0, 0])
    expect(feetOf(grid, "wall:2,0")).toBe(cellTop(2) + CELL)
  })

  it("stand on its own cell's north floor line in a plain corridor sealed to the north", () => {
    const grid = floorOf([[corridor(["s"])], [gate], [corridor(["n", "s"])], [corridor(["n"])]], [3, 0])
    expect(feetOf(grid, "wall:1,0")).toBe(cellTop(1))
  })

  it("stand half a band down in an opening whose back wall is painted either side", () => {
    const grid = floorOf(
      [
        [empty, corridor(["s"]), empty],
        [empty, gate, empty],
        [corridor(["e"]), corridor(["n", "w", "e"]), corridor(["w"])],
      ],
      [0, 1]
    )
    expect(feetOf(grid, "wall:1,1")).toBe(cellTop(1) + CELL + WALL_H / 2)
  })

  it("stay where they are when the cells beside the opening are still fogged", () => {
    const fogged = (cell: GridCell) => ({ ...cell, state: "fogged" }) as GridCell
    const grid = floorOf(
      [
        [empty, corridor(["s"]), empty],
        [empty, gate, empty],
        [fogged(corridor(["e"])), corridor(["n", "w", "e"]), fogged(corridor(["w"]))],
      ],
      [0, 1]
    )
    expect(feetOf(grid, "wall:1,1")).toBe(cellTop(1) + CELL + WALL_H / 2)
  })
})
