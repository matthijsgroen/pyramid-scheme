import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"
import { markerAt, offerContextFrom, offeredTargets } from "./clickTargets"
import { corridorRunTargetsFrom } from "./corridorRuns"

const dirs = (...d: Direction[]) => new Set(d)

// A player's room, `between` straight corridor cells, then a door room, all in one row.
const rowWith = (between: number, door: { shut: boolean }): FloorGrid => {
  const cells: GridCell[] = [{ type: "room", roomType: "encounter", dirs: dirs("e"), state: "completed" }]
  for (let i = 0; i < between; i++) cells.push({ type: "corridor", dirs: dirs("e", "w"), state: "visible" })
  cells.push({
    type: "room",
    roomType: "encounter",
    dirs: dirs("w"),
    state: "reachable",
    requiredKeyId: "door",
    tags: ["gate"],
    // A room that renders a board is a gate the player can open; one with no family is a shut way out.
    ...(door.shut ? {} : { family: "kakuro" }),
  } as GridCell)
  return {
    siteId: "t",
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    cells: [cells],
  }
}

describe("the far end of a corridor run", () => {
  it("is the cell before a shut gate, not nothing", () => {
    const grid = rowWith(3, { shut: true })
    const runs = corridorRunTargetsFrom(grid, [0, 0])
    expect(runs.get("0,1")).toEqual({ row: 0, col: 3, dir: "e" })
    expect(offeredTargets(grid, buildRoomClaims(grid), [0, 0]).get("0,1")).toEqual([0, 3])
    expect(markerAt(grid, buildRoomClaims(grid), 0, 1, offerContextFrom(grid, [0, 0], {}))).toEqual({
      kind: "arrow",
      dir: "e",
    })
  })

  it("is the near cell itself when the door is right behind it", () => {
    const grid = rowWith(1, { shut: true })
    expect(corridorRunTargetsFrom(grid, [0, 0]).get("0,1")).toEqual({ row: 0, col: 1, dir: "e" })
    expect(offeredTargets(grid, buildRoomClaims(grid), [0, 0]).get("0,1")).toEqual([0, 1])
  })

  it("is the gate room when the gate can be opened", () => {
    const grid = rowWith(3, { shut: false })
    expect(corridorRunTargetsFrom(grid, [0, 0]).get("0,1")).toEqual({ row: 0, col: 4, dir: "e" })
    expect(offeredTargets(grid, buildRoomClaims(grid), [0, 0]).get("0,1")).toEqual([0, 4])
  })

  it("offers nothing toward a shut gate that is the very next cell", () => {
    const grid = rowWith(0, { shut: true })
    expect(corridorRunTargetsFrom(grid, [0, 0]).size).toBe(0)
  })
})
