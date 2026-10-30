import { describe, expect, it } from "vitest"
import type { CellState, CorridorCell, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { cellAddress } from "@/game/cellAddress"
import { assembleFloor } from "@/game/carve/assembleFloor"
import { plainFloor } from "@/game/carve/carveFixtures"
import { ROOMS_ENGINE } from "@/game/carve/engines"
import { findByAddress } from "./cellIdentity"
import { buildRoomClaims, cellFloorAt, isPassable } from "./roomClaims"

const way = (dirs: Direction[], state: CellState = "visible", shoulder?: Direction): CorridorCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
  ...(shoulder ? { shoulder } : {}),
})
const lane = (shoulderOf: string): CorridorCell => ({ type: "corridor", dirs: new Set(), state: "fogged", shoulderOf })
const EMPTY: GridCell = { type: "empty" }

// A wide corridor along row 0 with its second lane on row 1, and another wide corridor running down column 3 beside the
// lane's end.
const floor = (laneCellState: CellState = "visible"): FloorGrid => ({
  siteId: "site",
  rows: 3,
  cols: 4,
  entrancePos: [0, 0],
  exitPos: [0, 3],
  staircases: {},
  cells: [
    [way(["e"]), way(["e", "w"], "visible", "s"), way(["e", "w"], laneCellState, "s"), way(["w"])],
    [EMPTY, lane("0,1"), lane("0,2"), way(["s"], "visible", "e")],
    [EMPTY, EMPTY, EMPTY, way(["n"])],
  ],
})

describe("a wide corridor's second lane on the map", () => {
  it("is open toward its own corridor and the rest of its lane, and walled from another corridor", () => {
    const grid = floor()
    const claims = buildRoomClaims(grid)
    expect(isPassable(grid, claims, 0, 1, "s")).toBe(true)
    expect(isPassable(grid, claims, 0, 2, "s")).toBe(true)
    expect(isPassable(grid, claims, 1, 1, "e")).toBe(true)
    expect(isPassable(grid, claims, 1, 2, "e")).toBe(false)
  })

  it("is drawn as corridor floor, lit as the lane cell it widens", () => {
    const grid = floor("fogged")
    const claims = buildRoomClaims(grid)
    expect(cellFloorAt(grid, claims, undefined, 1, 1)).toEqual(
      expect.objectContaining({ state: "visible", kind: "corridor" })
    )
    expect(cellFloorAt(grid, claims, undefined, 1, 2)).toBe("unlit")
  })

  it("has no save address, and an address on a wide floor never finds it", () => {
    const result = assembleFloor(
      "test",
      plainFloor({ pathPuzzles: 4, corridorWidth: 2 }),
      3,
      undefined,
      {},
      {
        engine: ROOMS_ENGINE,
      }
    )
    if (!result.success) throw new Error(JSON.stringify(result.reasons))
    const { grid } = result
    const lanes = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "corridor" && cell.shoulderOf ? [{ at: [r, c] as const, cell }] : []))
    )
    expect(lanes.length).toBeGreaterThan(0)
    for (const { at, cell } of lanes) {
      expect(cellAddress(grid, 0, at[0], at[1])).toBeNull()
      const [r, c] = cell.shoulderOf!.split(",").map(Number)
      const address = cellAddress(grid, 0, r, c)
      expect(address).not.toBeNull()
      const [fr, fc] = findByAddress(grid, 0, address!)!
      const found = grid.cells[fr][fc]
      expect(found.type === "corridor" && found.shoulderOf).toBeFalsy()
    }
  })
})
