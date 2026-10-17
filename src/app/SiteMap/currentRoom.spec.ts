import { describe, expect, it } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { drawnAsCurrent } from "./currentRoom"

const room = (state: "completed" | "reachable" | "visible"): GridCell =>
  ({ type: "room", state, dirs: [] }) as unknown as GridCell

const grid = (cells: GridCell[][]): FloorGrid => ({ cells }) as unknown as FloorGrid

describe("drawnAsCurrent", () => {
  it("draws a finished room the explorer stands in as current, not as done", () => {
    const drawn = drawnAsCurrent(grid([[room("completed"), room("completed")]]), new Set(["0,0"]))

    expect(drawn.cells[0][0]).toMatchObject({ state: "reachable" })
  })

  it("leaves every other finished room dimmed as done", () => {
    const drawn = drawnAsCurrent(grid([[room("completed"), room("completed")]]), new Set(["0,0"]))

    expect(drawn.cells[0][1]).toMatchObject({ state: "completed" })
  })

  it("never brightens a cell that is only seen", () => {
    const drawn = drawnAsCurrent(grid([[room("visible")]]), new Set(["0,0"]))

    expect(drawn.cells[0][0]).toMatchObject({ state: "visible" })
  })

  it("hands back the same grid when nothing changes, so a memo downstream holds", () => {
    const original = grid([[room("reachable")]])

    expect(drawnAsCurrent(original, new Set(["0,0"]))).toBe(original)
  })
})
