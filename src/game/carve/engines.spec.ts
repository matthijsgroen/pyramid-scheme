import { describe, expect, it } from "vitest"
import type { FloorConfig, FloorGrid } from "../siteTypes"
import { assembleFloor } from "./assembleFloor"
import { carveFloor } from "./carveFloor"
import { LATTICE_ENGINE, type Engine } from "./engines"
import { prepareFloor } from "./prepareFloor"
import { pass } from "./state"

const config: FloorConfig = {
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
}
const grid = { rows: 1, cols: 1 } as FloorGrid

const markerEngine = (marks: string[]): Engine => ({
  ...LATTICE_ENGINE,
  passes: [
    pass("marker", [], [], () => {
      marks.push("ran")
    }),
  ],
  finish: () => grid,
})

describe("engines", () => {
  it("carveFloor runs the engine's passes and finish", () => {
    const prepared = prepareFloor("site", config, 1)
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.reasons))
    const marks: string[] = []
    expect(carveFloor(prepared.prep, markerEngine(marks))).toEqual({ success: true, grid, attempt: 0 })
    expect(marks).toEqual(["ran"])
  })

  it("assembleFloor takes an engine override", () => {
    const marks: string[] = []
    const result = assembleFloor("site", config, 1, undefined, {}, { engine: markerEngine(marks) })
    expect(result.success && result.grid).toBe(grid)
    expect(marks.length).toBeGreaterThan(0)
  })
})
