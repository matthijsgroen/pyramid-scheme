import { describe, expect, it } from "vitest"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { COL_PITCH, ROW_PITCH } from "./mapScale"
import { buildRoomClaims } from "./roomClaims"
import { standingOffset } from "./standingSpot"

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })
const stair = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "portal",
  stairId: "s1",
  dirs: new Set(dirs),
  state,
})

const floor = (cells: GridCell[][]): FloorGrid => ({
  siteId: "site",
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  staircases: {},
  cells,
})

const offsetAt = (grid: FloorGrid, r: number, c: number) => standingOffset(grid, buildRoomClaims(grid), r, c)

describe("where the explorer stands in a stair's room", () => {
  it("stands in the bare cell beside the stair, a full cell off its node", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, stair(["n"]), empty],
      [empty, empty, empty],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: COL_PITCH, dy: 0 })
  })

  it("stands in front of the stair when neither side is the room's floor", () => {
    const grid = floor([
      [corridor(["e"]), corridor(["w", "s"]), corridor(["w"])],
      [corridor(["s"]), stair(["n"]), corridor(["s"])],
      [corridor(["n"]), empty, corridor(["n"])],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: ROW_PITCH })
  })

  it("never stands on the cell the room's prop stands on", () => {
    const grid = floor([
      [corridor(["e"]), corridor(["w", "s"]), corridor(["w"])],
      [corridor(["s"]), { ...stair(["n"]), decoration: "shelf", activity: "storage" } as GridCell, empty],
      [corridor(["n"]), empty, empty],
    ])
    const claims = buildRoomClaims(grid)
    const propAt = [...claims.decorationAt.keys()]
    expect(propAt).toHaveLength(1)
    const { dx, dy } = standingOffset(grid, claims, 1, 1)
    const standsOn = `${1 + dy / ROW_PITCH},${1 + dx / COL_PITCH}`
    expect(standsOn).not.toBe(propAt[0])
    expect(claims.claimedBy.get(standsOn)).toBe("1,1")
  })

  it("stays on the node of a room that is not a stair", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, { type: "room", roomType: "encounter", dirs: new Set<Direction>(["n"]), state }, empty],
      [empty, empty, empty],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: 0 })
  })

  it("stays on the node of a stair whose room has no bare floor", () => {
    const grid = floor([
      [corridor(["e", "s"]), corridor(["w", "s", "e"]), corridor(["w", "s"])],
      [corridor(["n", "s"]), stair(["n"]), corridor(["n", "s"])],
      [corridor(["n", "e"]), corridor(["w", "e"]), corridor(["w", "n"])],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: 0 })
  })
})
