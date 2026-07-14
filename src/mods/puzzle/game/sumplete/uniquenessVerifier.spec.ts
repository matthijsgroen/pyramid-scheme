import { describe, expect, it } from "vitest"
import { countSolutions } from "./uniquenessVerifier"

describe("countSolutions", () => {
  it("returns 1 for a known unique puzzle", () => {
    // diagonal solution: (0,0)=1, (1,1)=5, (2,2)=9
    const grid = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]
    expect(countSolutions(grid, [1, 5, 9], [1, 5, 9])).toBe(1)
  })

  it("returns 2 for an ambiguous puzzle", () => {
    // 2×2 all-ones: two solutions (diagonal or anti-diagonal)
    const grid = [
      [1, 1],
      [1, 1],
    ]
    expect(countSolutions(grid, [1, 1], [1, 1])).toBe(2)
  })

  it("returns 0 for an impossible puzzle", () => {
    const grid = [
      [1, 2],
      [3, 4],
    ]
    expect(countSolutions(grid, [10, 10], [1, 2])).toBe(0)
  })

  it("returns 1 for all-included solution", () => {
    const grid = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 1, 2, 3],
      [4, 5, 6, 7],
    ]
    const rowTargets = grid.map(row => row.reduce((a, b) => a + b, 0))
    const colTargets = [0, 1, 2, 3].map(j => grid.reduce((s, r) => s + r[j], 0))
    expect(countSolutions(grid, rowTargets, colTargets)).toBe(1)
  })
})
