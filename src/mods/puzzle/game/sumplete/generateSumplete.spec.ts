import { describe, expect, it } from "vitest"
import { generateSumplete } from "./generateSumplete"
import { SUMPLETE_CONFIG } from "./sumpleteConfig"
import { solveByTechniques } from "./techniques"
import { difficulties } from "@/data/difficultyLevels"

describe("generateSumplete", () => {
  it("is deterministic", () => {
    expect(generateSumplete(4, 42)).toEqual(generateSumplete(4, 42))
  })

  it("different seeds produce different boards", () => {
    expect(generateSumplete(4, 1)).not.toEqual(generateSumplete(4, 2))
  })

  it("targets match the answer", () => {
    const { grid, rowTargets, colTargets, solution } = generateSumplete(5, 99)
    for (let i = 0; i < 5; i++) {
      expect(grid[i].reduce((sum, value, j) => sum + (solution[i][j] ? value : 0), 0)).toBe(rowTargets[i])
      expect(grid.reduce((sum, row, j) => sum + (solution[j][i] ? row[i] : 0), 0)).toBe(colTargets[i])
    }
  })

  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = SUMPLETE_CONFIG[difficulty]
    const boards = Array.from({ length: 10 }, (_, seed) => generateSumplete(size, seed + 1, options))

    it("never needs a guess — every board settles inside its own technique cap", () => {
      for (const board of boards) expect(solveByTechniques(board, board.techniqueCap).settled).toBe(true)
    })

    it("never asks for a lone number: every row and column keeps at least two cells", () => {
      for (const { solution } of boards)
        for (let i = 0; i < size; i++) {
          expect(solution[i].filter(Boolean).length).toBeGreaterThanOrEqual(2)
          expect(solution.filter(row => row[i]).length).toBeGreaterThanOrEqual(2)
        }
    })

    it("never asks for a whole line: every row and column strikes at least one cell", () => {
      for (const { solution } of boards)
        for (let i = 0; i < size; i++) {
          expect(solution[i].filter(Boolean).length).toBeLessThan(size)
          expect(solution.filter(row => row[i]).length).toBeLessThan(size)
        }
    })

    it("has no zero target", () => {
      for (const { rowTargets, colTargets } of boards)
        expect([...rowTargets, ...colTargets].every(target => target > 0)).toBe(true)
    })

    it("deduces the same answer the board was built from", () => {
      for (const board of boards) {
        const { marks } = solveByTechniques(board, board.techniqueCap)
        expect(marks.map(row => row.map(mark => mark === "keep"))).toEqual(board.solution)
      }
    })
  })
})
