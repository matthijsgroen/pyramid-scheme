import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { BALANCE_CONFIG } from "./balanceConfig"
import { generateBalance } from "./generateBalance"
import { solveByTechniques, type Scale } from "./techniques"

const panTotal = (items: Scale["left"], values: Record<string, number>) =>
  items.reduce((sum, item) => sum + (item.kind === "weight" ? item.value : values[item.glyph]), 0)

describe("generateBalance", () => {
  it("is deterministic", () => {
    expect(generateBalance(42)).toEqual(generateBalance(42))
  })

  it("different seeds produce different boards", () => {
    expect(generateBalance(1)).not.toEqual(generateBalance(2))
  })

  describe.each(difficulties)("at %s", difficulty => {
    const options = BALANCE_CONFIG[difficulty]
    const boards = Array.from({ length: 10 }, (_, seed) => generateBalance(seed + 1, options))

    it("every scale really balances under the answer", () => {
      for (const { scales, solution } of boards)
        for (const scale of scales) expect(panTotal(scale.left, solution)).toBe(panTotal(scale.right, solution))
    })

    it("never needs a guess — every board settles inside its own technique cap", () => {
      for (const board of boards) expect(solveByTechniques(board, board.techniqueCap).settled).toBe(true)
    })

    it("needs exactly its cap, so the tier is honest", () => {
      for (const board of boards)
        expect(solveByTechniques(board, board.techniqueCap).deepest).toBe(options.techniqueCap)
    })

    it("deduces the same weights the board was built from", () => {
      for (const board of boards)
        expect(solveByTechniques(board, board.techniqueCap).assignment).toEqual(board.solution)
    })

    it("gives every glyph its own weight", () => {
      for (const { glyphs, solution } of boards)
        expect(new Set(glyphs.map(glyph => solution[glyph])).size).toBe(glyphs.length)
    })

    it("holds something in every pan, and shows no scale twice", () => {
      for (const { scales } of boards) {
        for (const { left, right } of scales) {
          expect(left.length).toBeGreaterThan(0)
          expect(right.length).toBeGreaterThan(0)
        }
        expect(new Set(scales.map(scale => JSON.stringify(scale))).size).toBe(scales.length)
      }
    })

    it("shows no scale the board can do without", () => {
      for (const board of boards)
        for (let index = 0; index < board.scales.length; index++) {
          const fewer = solveByTechniques(
            { ...board, scales: board.scales.filter((_, i) => i !== index) },
            board.techniqueCap
          )
          expect(fewer.settled && fewer.deepest === board.techniqueCap).toBe(false)
        }
    })
  })
})
