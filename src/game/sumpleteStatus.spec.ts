import { describe, expect, it } from "vitest"
import { computeColStatuses, computeRowStatuses, isSumpleteSolved } from "./sumpleteStatus"
import type { SumpleteCellState } from "./sumpleteState"

// row sums when everything counts: row0 = 1+2 = 3, row1 = 3+4 = 7
// col sums when everything counts: col0 = 1+3 = 4, col1 = 2+4 = 6
const grid = [
  [1, 2],
  [3, 4],
]

const allIncluded: SumpleteCellState[][] = [
  ["included", "included"],
  ["included", "included"],
]

describe("sumpleteStatus", () => {
  it("marks exact when the sum matches the target", () => {
    expect(computeRowStatuses(grid, allIncluded, [3, 7])).toEqual(["exact", "exact"])
    expect(computeColStatuses(grid, allIncluded, [4, 6])).toEqual(["exact", "exact"])
  })

  it("marks over when the sum exceeds the target, under when it falls short", () => {
    expect(computeRowStatuses(grid, allIncluded, [2, 8])).toEqual(["over", "under"])
  })

  it("treats excluded cells as not counting towards the sum", () => {
    const cells: SumpleteCellState[][] = [
      ["excluded", "included"], // row0 = 0+2 = 2
      ["included", "excluded"], // row1 = 3+0 = 3
    ]
    expect(computeRowStatuses(grid, cells, [2, 3])).toEqual(["exact", "exact"])
    expect(computeColStatuses(grid, cells, [3, 2])).toEqual(["exact", "exact"]) // col0=0+3=3, col1=2+0=2
  })

  it("is solved only when every row and column is exact", () => {
    expect(isSumpleteSolved(["exact", "exact"], ["exact", "exact"])).toBe(true)
    expect(isSumpleteSolved(["exact", "under"], ["exact", "exact"])).toBe(false)
    expect(isSumpleteSolved(["exact", "exact"], ["over", "exact"])).toBe(false)
  })
})
