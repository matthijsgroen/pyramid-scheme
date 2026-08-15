import { describe, expect, it } from "vitest"
import { computeColLines, computeRowLines, isSumpleteSolved, type SumpleteLine } from "./sumpleteStatus"
import type { SumpleteMark } from "./techniques"

// Uncrossed sums: row0 = 1+2 = 3, row1 = 3+4 = 7, col0 = 1+3 = 4, col1 = 2+4 = 6
const grid = [
  [1, 2],
  [3, 4],
]

const untouched: SumpleteMark[][] = [
  ["unknown", "unknown"],
  ["unknown", "unknown"],
]

const line = (total: number, target: number, status: SumpleteLine["status"]) => ({ total, target, status })

describe("sumpleteStatus", () => {
  it("reports each line's live total beside its target", () => {
    expect(computeRowLines(grid, untouched, [3, 7])).toEqual([line(3, 3, "exact"), line(7, 7, "exact")])
    expect(computeColLines(grid, untouched, [4, 6])).toEqual([line(4, 4, "exact"), line(6, 6, "exact")])
  })

  it("marks over when the line adds up past its target, under when it falls short", () => {
    expect(computeRowLines(grid, untouched, [2, 8]).map(l => l.status)).toEqual(["over", "under"])
  })

  it("counts a struck cell as gone and a kept one as staying", () => {
    const cells: SumpleteMark[][] = [
      ["strike", "keep"], // row0 = 0+2 = 2
      ["keep", "strike"], // row1 = 3+0 = 3
    ]
    expect(computeRowLines(grid, cells, [2, 3]).map(l => l.status)).toEqual(["exact", "exact"])
    expect(computeColLines(grid, cells, [3, 2]).map(l => l.status)).toEqual(["exact", "exact"])
  })

  it("is solved only when every row and column is exact", () => {
    const exact = line(1, 1, "exact")
    expect(isSumpleteSolved([exact, exact], [exact, exact])).toBe(true)
    expect(isSumpleteSolved([exact, line(0, 1, "under")], [exact, exact])).toBe(false)
    expect(isSumpleteSolved([exact, exact], [line(2, 1, "over"), exact])).toBe(false)
  })
})
