import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "../siteTypes"
import { trimBareTails } from "./trimBareTails"

const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[], more: Partial<Extract<GridCell, { type: "corridor" }>> = {}): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "fogged",
  ...more,
})
const room = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "fogged",
})
const gridOf = (cells: GridCell[][]): FloorGrid =>
  ({
    cells,
    rows: cells.length,
    cols: cells[0].length,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    siteId: "trim",
  }) as FloorGrid
const shape = (grid: FloorGrid) =>
  grid.cells.map(row => row.map(cell => (cell.type === "empty" ? " " : [...cell.dirs].sort().join(""))).join("|"))

describe("a corridor leading to nothing", () => {
  it("is taken off back to the room it leaves, and that room loses the way", () => {
    const grid = gridOf([[room(["e"]), room(["w", "e"]), corridor(["w", "e"]), corridor(["w", "e"]), corridor(["w"])]])
    expect(shape(trimBareTails(grid))).toEqual(["e|w| | | "])
  })

  it("stays where it reaches a drop's lip, a stair or a hidden way", () => {
    const lip = gridOf([[room(["e"]), corridor(["w"]), corridor(["e"], { obstacle: { dir: "e", kind: "drop" } })]])
    expect(trimBareTails(lip)).toBe(lip)
    const stair = { ...gridOf([[room(["e"]), corridor(["w"])]]), staircases: { down: [0, 1] as const } }
    expect(trimBareTails(stair)).toBe(stair)
    const hidden = gridOf([[room(["e"]), corridor(["w"], { hidden: true })]])
    expect(trimBareTails(hidden)).toBe(hidden)
  })

  it("keeps every cell of a region with no room in it, so the lock's walk still sees it", () => {
    const grid = gridOf([[room(["e"]), corridor(["w", "e"], { region: "side" }), corridor(["w"], { region: "side" })]])
    expect(trimBareTails(grid)).toBe(grid)
    const door: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set<Direction>(["w", "e"]),
      state: "fogged",
      region: "side",
      requiredKeyId: "made-up",
    }
    const behindADoor = gridOf([[room(["e"]), door, corridor(["w"], { region: "side" })]])
    expect(trimBareTails(behindADoor)).toBe(behindADoor)
  })

  it("leaves a floor where every corridor ends at something untouched", () => {
    const grid = gridOf([
      [room(["e"]), corridor(["w", "e"]), room(["w"])],
      [empty, empty, empty],
    ])
    expect(trimBareTails(grid)).toBe(grid)
  })
})
