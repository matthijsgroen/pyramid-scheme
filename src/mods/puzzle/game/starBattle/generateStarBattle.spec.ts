import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { groupsOf, neighboursOf, starsIn, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { generateStarBattle, techniquesUpTo } from "./generateStarBattle"
import { solveStarBattleByTechniques, techniqueRank } from "./techniques"

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6]

/** Whether every region is one connected piece: a region drawn in two halves is not a clue anyone can read. */
const contiguous = (puzzle: StarBattlePuzzle, region: number) => {
  const cells = puzzle.regions.flatMap((at, cell) => (at === region ? [cell] : []))
  const seen = new Set([cells[0]])
  const queue = [cells[0]]
  while (queue.length) {
    const cell = queue.shift()!
    // Orthogonal only — two cells touching at a corner are not one piece.
    for (const at of neighboursOf(puzzle.size, cell)) {
      const straight =
        cell % puzzle.size === at % puzzle.size || Math.floor(cell / puzzle.size) === Math.floor(at / puzzle.size)
      if (!straight || seen.has(at) || puzzle.regions[at] !== region) continue
      seen.add(at)
      queue.push(at)
    }
  }
  return seen.size === cells.length
}

describe("generateStarBattle", () => {
  it.each(TIERS)("draws a %s board that deduction alone finishes", { timeout: 60_000 }, tier => {
    const options = STAR_BATTLE_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateStarBattle(seed, options)
      const result = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap))
      // No board may need a guess. Every square decided by forced steps is also what settles uniqueness,
      // so no solution counter runs anywhere in this family.
      expect(result.settled, `${tier} seed ${seed}`).toBe(true)
      expect(result.marks.map(mark => mark === "star")).toEqual([...board.solution])
      expect(techniqueRank(result.deepest!)).toBeLessThanOrEqual(techniqueRank(options.techniqueCap))
    }
  })

  it.each(TIERS)("draws a %s board whose answer obeys the rules", { timeout: 60_000 }, tier => {
    const options = STAR_BATTLE_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateStarBattle(seed, options)
      const marks = board.solution.map(star => (star ? ("star" as const) : undefined))
      // Every row, column and region holds its quota, and no two stars touch.
      groupsOf(board).forEach((group, index) => {
        expect(starsIn(marks, group).length, `${tier} seed ${seed} group ${index}`).toBe(board.quota)
      })
      board.solution.forEach((star, cell) => {
        if (star) expect(neighboursOf(board.size, cell).filter(at => board.solution[at])).toEqual([])
      })
      expect(board.regions.length).toBe(options.size ** 2)
      for (let region = 0; region < options.size; region++) expect(contiguous(board, region)).toBe(true)
    }
  })

  it("is seeded: the same seed draws the same sky, a different one draws another", () => {
    const options = STAR_BATTLE_CONFIG.expert
    expect(generateStarBattle(11, options)).toEqual(generateStarBattle(11, options))
    expect(generateStarBattle(11, options)).not.toEqual(generateStarBattle(12, options))
  })

  /**
   * The tier's own rung, spent its quota of times.
   *
   * A tier that never demands its rung teaches the tier below it. The nearest miss ships as the fallback
   * rather than nothing, which is why this checks the run of seeds rather than every one of them.
   */
  it.each(TIERS.filter(tier => STAR_BATTLE_CONFIG[tier].requires))(
    "spends its own rung at %s",
    { timeout: 60_000 },
    tier => {
      const options = STAR_BATTLE_CONFIG[tier]
      const met = SEEDS.filter(seed => {
        const board = generateStarBattle(seed, options)
        const { steps } = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap))
        return steps.filter(step => options.requires!.includes(step.technique)).length >= (options.requiresCount ?? 1)
      })
      expect(met.length).toBeGreaterThanOrEqual(SEEDS.length - 1)
    }
  )

  /**
   * The region map is the whole clue, at every tier.
   *
   * A board carries no givens and no hatching — nothing but where the boundaries run — which is what the
   * family's first draft got wrong (design doc §4). A board that shipped anything else would be a board
   * doing some of the player's reasoning for them, so this guards the claim directly: the puzzle is a size,
   * a quota and a region map, and every square is the player's to fill.
   */
  it.each(TIERS)("gives a %s board nothing but its region map", { timeout: 60_000 }, tier => {
    const options = STAR_BATTLE_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateStarBattle(seed, options)
      expect(Object.keys(board).sort(), `${tier} seed ${seed}`).toEqual([
        "quota",
        "regions",
        "size",
        "solution",
        "techniqueCap",
      ])
      // Region sizes are spread rather than even, and that spread is what makes the map a clue at all.
      const sizes = [...Array(options.size).keys()].map(region => board.regions.filter(at => at === region).length)
      expect(Math.min(...sizes), `${tier} seed ${seed} smallest region`).toBeLessThan(options.size)
      expect(Math.max(...sizes), `${tier} seed ${seed} largest region`).toBeGreaterThan(options.size)
    }
  })
})
