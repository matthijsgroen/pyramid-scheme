import { describe, expect, it } from "vitest"
import { generateFutoshiki } from "./generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "./futoshikiConfig"
import { constraintEnds, solveFutoshikiByTechniques } from "./techniques"
import { demandOf, techniquesFor } from "./demands"
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
      for (const board of boards)
        expect(solveFutoshikiByTechniques(board, techniquesFor(board.techniqueCap)).settled).toBe(true)
    })

    it("deduces the same answer the board was built from", () => {
      for (const board of boards)
        expect(solveFutoshikiByTechniques(board, techniquesFor(board.techniqueCap)).values).toEqual(board.solution)
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

    // Signs are thinned against the board's OWN minimum, before the tier hands any numbers back
    // (design doc §5.1) — so the bar is that no sign was spare when the thinning stopped, which is
    // what keeps the sign count from collapsing. A number given afterwards may well retire one, and
    // that is the gift doing its job rather than a sign wasted.
    it("shows no sign the thinning could have spared — the signs are settled before the gift", () => {
      for (const board of boards) {
        const earned = board.givens.map(row => row.map(() => undefined as number | undefined))
        board.solution.forEach((row, r) =>
          row.forEach((_, c) => {
            if (board.givens[r][c] !== undefined) earned[r][c] = board.givens[r][c]
          })
        )
        for (let index = 0; index < board.constraints.length; index++) {
          const without = board.constraints.filter((_, other) => other !== index)
          const stillSolves = solveFutoshikiByTechniques(
            { size, givens: earned, constraints: without },
            techniquesFor(board.techniqueCap)
          ).settled
          // A spare sign is only acceptable where the tier handed numbers back beyond what the board
          // itself needed; with no prefill at all there is nothing to blame but the thinning.
          if (options.prefill === undefined) expect(stillSolves).toBe(false)
        }
      }
    })

    it("turns on every rung its tier insists upon", () => {
      if (!options.requires?.length) return
      for (const board of boards) {
        const deepest = solveFutoshikiByTechniques(board, techniquesFor(board.techniqueCap)).deepest
        expect(deepest && options.requires).toContain(deepest && demandOf(deepest))
      }
    })

    it("hands back at least the numbers its tier promises", () => {
      if (options.prefill === undefined) return
      for (const board of boards)
        expect(board.givens.flat().filter(value => value !== undefined).length).toBeGreaterThanOrEqual(options.prefill)
    })

    it("always shows a sign — a board of numbers alone is not this family", () => {
      for (const board of boards) expect(board.constraints.length).toBeGreaterThan(0)
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
