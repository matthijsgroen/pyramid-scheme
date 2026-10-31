import { describe, expect, it } from "vitest"
import { assembleFloor } from "./assembleFloor"
import { plainFloor } from "./carveFixtures"
import type { FloorConfig, FloorGrid } from "../siteTypes"

const stairDirections = (config: FloorConfig): Record<string, string | undefined> => {
  const result = assembleFloor("site", config, 1)
  if (!result.success) throw new Error("assembly failed")
  const grid: FloorGrid = result.grid
  const out: Record<string, string | undefined> = {}
  for (const row of grid.cells)
    for (const cell of row) if (cell.type === "room" && cell.stairId) out[cell.stairId] = cell.stairGoes
  return out
}

describe("a stairhead's direction", () => {
  it("a stairhead carries its link's direction, else the default", () => {
    const linked = (goes?: { entrance: "down"; exit: "up"; side: "up" }) =>
      plainFloor({
        entrance: { stairId: "in", ...(goes ? { goes: goes.entrance } : {}) },
        exitOrStaircase: { stairId: "out", ...(goes ? { goes: goes.exit } : {}) },
        sideSections: [
          { pathPuzzles: 0, difficulty: "starter", end: { stairId: "side", ...(goes ? { goes: goes.side } : {}) } },
        ],
      })
    expect(stairDirections(linked())).toEqual({ in: "up", out: "down", side: "down" })
    expect(stairDirections(linked({ entrance: "down", exit: "up", side: "up" }))).toEqual({
      in: "down",
      out: "up",
      side: "up",
    })
  })
})
