import { describe, expect, it } from "vitest"
import { buildRoomClaims } from "./roomClaims"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })

// The carve dresses every room; the map stands a prop only on an empty cell the room claims.
describe("where a dressed room's prop stands", () => {
  it("stands nothing for a room that claims no floor, though the carve dressed it", () => {
    const puzzle: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "sumplete",
      dirs: new Set<Direction>(["e", "w"]),
      state,
      decoration: "shelf",
      activity: "storage",
    }
    const grid: FloorGrid = {
      siteId: "site",
      rows: 3,
      cols: 5,
      entrancePos: [1, 0],
      exitPos: [1, 4],
      staircases: {},
      cells: [
        [empty, empty, empty, empty, empty],
        [corridor(["e"]), corridor(["e", "w"]), puzzle, corridor(["e", "w"]), corridor(["w"])],
        [empty, empty, empty, empty, empty],
      ],
    }
    expect(buildRoomClaims(grid).decorationAt.size).toBe(0)
  })

  it("never stands a stairhead's prop on the stair's own cell", () => {
    const stairhead: GridCell = {
      type: "room",
      roomType: "portal",
      stairId: "down",
      dirs: new Set<Direction>(["n"]),
      state,
      decoration: "jarRack",
      activity: "storage",
    }
    const grid: FloorGrid = {
      siteId: "site",
      rows: 4,
      cols: 3,
      entrancePos: [0, 1],
      exitPos: [2, 1],
      staircases: { down: [2, 1] },
      cells: [
        [empty, corridor(["s"]), empty],
        [empty, corridor(["n", "s"]), empty],
        [empty, stairhead, empty],
        [empty, empty, empty],
      ],
    }
    const decorationAt = buildRoomClaims(grid).decorationAt
    expect([...decorationAt.values()]).toContain("jarRack")
    expect(decorationAt.has("2,1")).toBe(false)
  })
})
