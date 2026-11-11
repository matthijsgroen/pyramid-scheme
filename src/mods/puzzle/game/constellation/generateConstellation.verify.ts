import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { constellationSolved, crossingsByPair, pairsByStar, degreeOf } from "./constellation"
import { CONSTELLATION_CONFIG } from "./constellationConfig"
import { generateConstellation, techniquesUpTo } from "./generateConstellation"
import { solveConstellationByTechniques, techniqueRank } from "./techniques"

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

describe("generateConstellation", () => {
  it.each(TIERS)("draws a %s board that deduction alone finishes", tier => {
    const options = CONSTELLATION_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateConstellation(seed, options)
      const result = solveConstellationByTechniques(board, techniquesUpTo(options.techniqueCap))
      // Rule 4 of the screen bar: no board may need a guess. Every pair decided by forced steps is also what
      // settles uniqueness, so no solution counter runs anywhere in this family.
      expect(result.settled, `${tier} seed ${seed}`).toBe(true)
      expect(result.lines).toEqual([...board.solution])
      expect(techniqueRank(result.deepest!)).toBeLessThanOrEqual(techniqueRank(options.techniqueCap))
    }
  })

  it.each(TIERS)("draws a %s board whose answer obeys the rules", tier => {
    const options = CONSTELLATION_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateConstellation(seed, options)
      const byStar = pairsByStar(board)
      expect(board.stars.length, `${tier} seed ${seed} stars`).toBe(options.stars)
      expect(constellationSolved(board, { lines: [...board.solution] })).toBe(true)
      // Every number is what its lines add up to, no star is left out of the sky, and nothing crosses.
      board.stars.forEach((star, index) => {
        expect(degreeOf(byStar, board.solution, index)).toBe(star.count)
        expect(star.count).toBeGreaterThan(0)
      })
      const crossings = crossingsByPair(board)
      board.solution.forEach((count, pair) => {
        expect(count).toBeLessThanOrEqual(2)
        if (count) expect(crossings[pair].filter(other => board.solution[other] > 0)).toEqual([])
      })
    }
  })

  it("is seeded: the same seed draws the same sky, a different one draws another", () => {
    const options = CONSTELLATION_CONFIG.expert
    expect(generateConstellation(11, options)).toEqual(generateConstellation(11, options))
    expect(generateConstellation(11, options)).not.toEqual(generateConstellation(12, options))
  })

  /**
   * The tier's own rung, spent its quota of times.
   *
   * A tier that never demands its rung teaches the tier below it. There is no thinning pass to lean on here,
   * so a miss is a redraw — and the nearest miss ships as the fallback rather than nothing, which is why this
   * checks the run of seeds rather than every one of them.
   */
  it.each(TIERS.filter(tier => CONSTELLATION_CONFIG[tier].requires))("spends its own rung at %s", tier => {
    const options = CONSTELLATION_CONFIG[tier]
    const met = SEEDS.filter(seed => {
      const board = generateConstellation(seed, options)
      const { steps } = solveConstellationByTechniques(board, techniquesUpTo(options.techniqueCap))
      return steps.filter(step => options.requires!.includes(step.technique)).length >= (options.requiresCount ?? 1)
    })
    expect(met.length).toBeGreaterThanOrEqual(SEEDS.length - 1)
  })
})
