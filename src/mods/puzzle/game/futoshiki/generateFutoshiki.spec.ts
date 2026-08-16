import { describe, expect, it } from "vitest"
import { generateFutoshiki } from "./generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "./futoshikiConfig"
import { constraintEnds, solveFutoshikiByTechniques } from "./techniques"
import { isFutoshikiSolved } from "./futoshikiStatus"
import { difficulties } from "@/data/difficultyLevels"

describe("generateFutoshiki", () => {
  it("is deterministic", () => {
    expect(generateFutoshiki(4, 42)).toEqual(generateFutoshiki(4, 42))
  })

  it("different seeds produce different boards", () => {
    expect(generateFutoshiki(4, 1)).not.toEqual(generateFutoshiki(4, 2))
  })

  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = FUTOSHIKI_CONFIG[difficulty]
    const boards = Array.from({ length: 8 }, (_, seed) => generateFutoshiki(size, seed + 1, options))

    it("never needs a guess — every board settles inside its own technique cap", () => {
      for (const board of boards) expect(solveFutoshikiByTechniques(board, board.techniqueCap).settled).toBe(true)
    })

    it("deduces the same answer the board was built from", () => {
      for (const board of boards)
        expect(solveFutoshikiByTechniques(board, board.techniqueCap).values).toEqual(board.solution)
    })

    it("its answer is a grid the game accepts as solved", () => {
      for (const board of boards) expect(isFutoshikiSolved(board, board.solution)).toBe(true)
    })

    it("every sign agrees with the answer", () => {
      for (const board of boards)
        for (const constraint of board.constraints) {
          const { lesser, greater } = constraintEnds(constraint)
          expect(board.solution[lesser.row][lesser.col]).toBeLessThan(board.solution[greater.row][greater.col])
        }
    })

    it("shows no sign the player cannot spend — every one is load-bearing", () => {
      for (const board of boards)
        for (let index = 0; index < board.constraints.length; index++) {
          const without = board.constraints.filter((_, other) => other !== index)
          expect(
            solveFutoshikiByTechniques({ size, givens: board.givens, constraints: without }, board.techniqueCap).settled
          ).toBe(false)
        }
    })

    it("keeps the signs rather than the pre-filled numbers — the signs are the puzzle", () => {
      for (const board of boards)
        expect(board.constraints.length).toBeGreaterThan(
          board.givens.flat().filter(value => value !== undefined).length
        )
    })

    it("keeps something to work out: no board is more answer than puzzle", () => {
      for (const board of boards) {
        const filled = board.givens.flat().filter(value => value !== undefined).length
        expect(filled).toBeLessThanOrEqual(size)
        expect(board.constraints.length).toBeGreaterThan(0)
      }
    })

    it("shows every pre-filled number in its answer's place", () => {
      for (const board of boards)
        board.givens.forEach((row, r) =>
          row.forEach((value, c) => {
            if (value !== undefined) expect(value).toBe(board.solution[r][c])
          })
        )
    })
  })
})
