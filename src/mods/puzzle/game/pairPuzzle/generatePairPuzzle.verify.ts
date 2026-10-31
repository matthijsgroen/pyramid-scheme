import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { generatePairPuzzle, gradePairPuzzle } from "./generatePairPuzzle"
import { pairSolved } from "./pairPuzzle"
import { PAIR_PUZZLE_CONFIG } from "./pairPuzzleConfig"
import { PAIR_TECHNIQUES, pairTechniquesUpTo, solvePairByTechniques, type PairTechniqueId } from "./techniques"

const TIERS: Difficulty[] = ["master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]
const fired = new Set<PairTechniqueId>()

describe.each(TIERS)("pair puzzle at %s", tier => {
  const options = PAIR_PUZZLE_CONFIG[tier]
  const boards = SEEDS.map(seed => generatePairPuzzle(seed, options))

  it("settles every board under the tier's ladder from blank marks", () => {
    for (const board of boards) {
      const result = solvePairByTechniques(board, pairTechniquesUpTo(options.techniqueCap))
      expect(result.settled).toBe(true)
      expect(result.marks.map(mark => mark === "piece")).toEqual([...board.solution])
      result.steps.forEach(step => fired.add(step.technique))
    }
  })

  it("answers with a solved board, one anchor to each piece, within the ceiling", () => {
    for (const board of boards) {
      expect(board.size).toBeLessThanOrEqual(9)
      expect(pairSolved(board, { marks: board.solution.map(piece => (piece ? "piece" : undefined)) })).toBe(true)
      expect(board.anchors.filter(Boolean).length).toBe(board.solution.filter(Boolean).length)
    }
  })

  it("grades every board", () => {
    for (const board of boards) expect(gradePairPuzzle(board, options)).not.toBeNull()
  })
})

it("turns every rung of the ladder on some generated board", () => {
  expect(PAIR_TECHNIQUES.filter(id => !fired.has(id))).toEqual([])
})
