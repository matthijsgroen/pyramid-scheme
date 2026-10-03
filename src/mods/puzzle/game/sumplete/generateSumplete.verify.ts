import { describe, expect, it } from "vitest"
import { generateSumplete, gradeSumplete } from "./generateSumplete"
import { SUMPLETE_CONFIG } from "./sumpleteConfig"
import { solveByTechniques, TECHNIQUES } from "./techniques"
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

describe("gradeSumplete", () => {
  it("grades a board the generator kept, naming what the ladder needed", () => {
    const board = generateSumplete(5, 99, { techniqueCap: "onlyCombination" })
    const grade = gradeSumplete(board, { techniqueCap: "onlyCombination" })
    expect(grade).not.toBeNull()
    expect(grade!.steps).toBeGreaterThan(0)
    expect(TECHNIQUES).toContain(grade!.deepest)
  })

  it("rejects a board whose line gates do not hold", () => {
    const board = generateSumplete(4, 7)
    // One kept cell in a row is the lone-number answer the gates exist to keep off the board.
    const solution = board.solution.map((row, i) => (i === 0 ? row.map((_, j) => j === 0) : row))
    expect(gradeSumplete({ ...board, solution })).toBeNull()
  })

  it("rejects a board the cap it is graded under cannot settle", () => {
    const board = generateSumplete(6, 12, { techniqueCap: "inEveryCombination" })
    // Graded under a cap far below the one it was built for, the ladder stalls before the last cell.
    const gentle = gradeSumplete(board, { techniqueCap: "tooBig" })
    const asBuilt = gradeSumplete(board, { techniqueCap: "inEveryCombination" })
    expect(asBuilt).not.toBeNull()
    expect(gentle).toBeNull()
  })
})

describe("generateSumplete attempt cap", () => {
  // The contract an offline seed list rests on: a seed admitted because it settles on its first
  // attempt must build that same board when play time runs exactly one attempt and skips every gate.
  it("gives a one-attempt build the same board as the full search, for every seed clean on the first", () => {
    const options = SUMPLETE_CONFIG.expert
    let clean = 0
    for (let seed = 1; seed <= 60; seed++) {
      let firstAttempt
      try {
        firstAttempt = generateSumplete(options.size, seed, options, 1)
      } catch {
        continue // not clean on its first attempt, so no list would ever carry it
      }
      clean++
      expect(firstAttempt).toEqual(generateSumplete(options.size, seed, options))
    }
    expect(clean).toBeGreaterThan(0)
  })

  it("refuses rather than searching on when the one attempt it was given misses", () => {
    const misses = Array.from({ length: 60 }, (_unused, seed) => seed + 1).filter(seed => {
      try {
        generateSumplete(4, seed, SUMPLETE_CONFIG.starter, 1)
        return false
      } catch {
        return true
      }
    })
    expect(misses.length).toBeGreaterThan(0)
  })
})
