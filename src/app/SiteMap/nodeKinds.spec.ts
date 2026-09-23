import { describe, expect, it } from "vitest"
import type { FloorGrid } from "@/game/siteTypes"
import { shapeKindFor } from "./nodeKinds"

const grid = {
  cells: [[{ type: "empty" }]],
  rows: 1,
  cols: 1,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "hand-built",
  staircases: {},
} as unknown as FloorGrid

describe("what shape a room draws as", () => {
  it("draws a bare junction as a junction", () => {
    expect(shapeKindFor(grid, 1, 1, "fork", undefined, undefined)).toBe("fork")
  })

  // A switch carries a puzzle, and a player who cannot see that before walking on has no way to know
  // the junction asks anything of them.
  it("draws a junction carrying an encounter as that encounter", () => {
    expect(shapeKindFor(grid, 1, 1, "fork", ["puzzle"], undefined)).toBe("puzzle")
    expect(shapeKindFor(grid, 1, 1, "fork", ["trap"], undefined)).toBe("trap")
  })

  it("still reads the entrance and a stairhead off the grid", () => {
    expect(shapeKindFor(grid, 0, 0, "portal", undefined, undefined)).toBe("entrance")
    expect(shapeKindFor(grid, 1, 1, "portal", undefined, "s1")).toBe("stairhead")
  })
})
