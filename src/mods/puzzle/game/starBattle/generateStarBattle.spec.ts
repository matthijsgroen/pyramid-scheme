import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { groupsOf, neighboursOf, starsIn, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { generateStarBattle, starBattleBlockedCount, techniquesUpTo } from "./generateStarBattle"
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
        // A blocked square is never part of the answer, and every star is a square the player can tap.
        expect(board.blocked[cell] && star).toBe(false)
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
   * Thinning has to take most of the answer back off the board.
   *
   * The loop starts from every non-star square blocked, so a board that shipped without thinning would be
   * the answer drawn in hatching. A fifth of the grid is the measured shape (design doc §4); this guards the
   * order of magnitude, not the number.
   */
  it.each(TIERS)("ships a %s board with the answer taken back off it", { timeout: 60_000 }, tier => {
    const options = STAR_BATTLE_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateStarBattle(seed, options)
      expect(starBattleBlockedCount(board), `${tier} seed ${seed}`).toBeLessThan(options.size ** 2 / 2)
    }
  })
})
