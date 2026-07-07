import { describe, expect, it } from "vitest"
import { generateSumplete } from "./generateSumplete"
import { countSolutions } from "./uniquenessVerifier"

describe("generateSumplete", () => {
  it("is deterministic", () => {
    expect(generateSumplete(3, 42)).toEqual(generateSumplete(3, 42))
  })

  it("different seeds produce different outputs", () => {
    expect(generateSumplete(3, 1)).not.toEqual(generateSumplete(3, 2))
  })

  it("rowTargets match solution", () => {
    const { grid, rowTargets, solution } = generateSumplete(3, 99)
    for (let i = 0; i < 3; i++) {
      const sum = grid[i].reduce((acc, val, j) => acc + (solution[i][j] ? val : 0), 0)
      expect(sum).toBe(rowTargets[i])
    }
  })

  it("colTargets match solution", () => {
    const { grid, colTargets, solution } = generateSumplete(3, 99)
    for (let j = 0; j < 3; j++) {
      const sum = grid.reduce((acc, row, i) => acc + (solution[i][j] ? row[j] : 0), 0)
      expect(sum).toBe(colTargets[j])
    }
  })

  it("property: 50 seeds × 3×3 all unique", () => {
    for (let seed = 0; seed < 50; seed++) {
      const { grid, rowTargets, colTargets } = generateSumplete(3, seed)
      expect(countSolutions(grid, rowTargets, colTargets)).toBe(1)
    }
  })

  it("property: 50 seeds × 4×4 all unique", () => {
    for (let seed = 0; seed < 50; seed++) {
      const { grid, rowTargets, colTargets } = generateSumplete(4, seed)
      expect(countSolutions(grid, rowTargets, colTargets)).toBe(1)
    }
  })

  it("allowZeroTargets:false produces no zero row/col targets", () => {
    for (let seed = 0; seed < 30; seed++) {
      const { rowTargets, colTargets } = generateSumplete(3, seed, { allowZeroTargets: false })
      expect([...rowTargets, ...colTargets].every(t => t > 0)).toBe(true)
    }
  })
})
