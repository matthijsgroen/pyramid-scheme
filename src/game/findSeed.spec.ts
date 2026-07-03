import { describe, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"

const denseConfig: FloorConfig = {
  pathPuzzles: 6,
  difficulty: "wizard",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "wizard", end: "treasure" },
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "blue" } },
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "red" } },
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "green" } },
    { pathPuzzles: 2, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "yellow" } },
    { pathPuzzles: 2, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "purple" } },
  ],
}

describe("find smallest grid that works", () => {
  it("scans seeds to find the grid size used", () => {
    for (let s = 1; s <= 50; s++) {
      const r = assembleFloor("t", denseConfig, s)
      if (r.success) {
        console.log(`seed=${s} grid=${r.grid.rows}x${r.grid.cols}`)
      }
    }
  })
})
