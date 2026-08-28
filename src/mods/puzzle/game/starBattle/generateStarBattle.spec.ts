import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { groupsOf, neighboursOf, starsIn, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { TWIN_STARS_CONFIG } from "./twinStars"
import {
  generateStarBattle,
  gradeStarBattle,
  techniquesUpTo,
  type StarBattleOptions,
  type StarBattlePuzzleWithAnswer,
} from "./generateStarBattle"
import { solveStarBattleByTechniques, techniqueRank } from "./techniques"

/**
 * The board a tier actually ships, drawn the way play draws it.
 *
 * A seed off the shipped list is a board no room is ever dealt, and it costs the generator its full
 * attempt loop to find one. A listed seed is the opposite on both counts: it was admitted offline
 * precisely because its FIRST attempt graded (`findSeeds`), so `attempts: 1` both matches play and
 * fails loudly when the list went stale under a generator that has since changed.
 */
const shippedSeed = (options: StarBattleOptions) => puzzleSeeds[configHash(options)]?.[0]

/** One board per tier, drawn once. Every claim below is a claim about that board. */
const drawOnce = () => {
  const drawn = new Map<Difficulty, StarBattlePuzzleWithAnswer>()
  return (config: Record<Difficulty, StarBattleOptions>, tier: Difficulty) => {
    const board = drawn.get(tier)
    if (board) return board
    const options = config[tier]
    const seed = shippedSeed(options)
    // A tier the baked world never draws at has no list to take from; it is still a tier the generator
    // must serve, so it draws with the ordinary attempt loop.
    const fresh = seed === undefined ? generateStarBattle(1, options) : generateStarBattle(seed, options, 1)
    drawn.set(tier, fresh)
    return fresh
  }
}

/**
 * Both families this generator draws for, each over the tiers it is actually allocated at.
 *
 * **One generator, two rules** — the star drawer, the region seeding and the acceptance loop are the same
 * code at either quota, so every claim below is a claim about both boards and neither gets a weaker suite
 * than the other. Twin stars is never drawn below expert (its 8×8 is the smallest grid its rule has boards
 * on at all), so its unreachable tiers are not exercised here.
 */
const FAMILIES: { name: string; config: Record<Difficulty, StarBattleOptions>; tiers: Difficulty[] }[] = [
  {
    name: "star battle",
    config: STAR_BATTLE_CONFIG,
    tiers: ["starter", "junior", "expert", "master", "wizard"],
  },
  { name: "twin stars", config: TWIN_STARS_CONFIG, tiers: ["junior", "expert", "master", "wizard"] },
]

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

describe.each(FAMILIES)("generateStarBattle for $name", ({ config, tiers }) => {
  const boardAt = drawOnce()

  it.each(tiers)("draws a %s board that deduction alone finishes", { timeout: 60_000 }, tier => {
    const options = config[tier]
    const board = boardAt(config, tier)
    const result = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap))
    // No board may need a guess. Every square decided by forced steps is also what settles uniqueness,
    // so no solution counter runs anywhere in this family.
    expect(result.settled, tier).toBe(true)
    expect(result.marks.map(mark => mark === "star")).toEqual([...board.solution])
    expect(techniqueRank(result.deepest!)).toBeLessThanOrEqual(techniqueRank(options.techniqueCap))
  })

  it.each(tiers)("draws a %s board whose answer obeys the rules", { timeout: 60_000 }, tier => {
    const options = config[tier]
    const board = boardAt(config, tier)
    const marks = board.solution.map(star => (star ? ("star" as const) : undefined))
    // Every row, column and region holds its quota, and no two stars touch.
    expect(board.quota).toBe(options.quota)
    groupsOf(board).forEach((group, index) => {
      expect(starsIn(marks, group).length, `${tier} group ${index}`).toBe(board.quota)
    })
    board.solution.forEach((star, cell) => {
      if (star) expect(neighboursOf(board.size, cell).filter(at => board.solution[at])).toEqual([])
    })
    expect(board.regions.length).toBe(options.size ** 2)
    // A two-star region is joined to its second star by the path claimed with it, so contiguity is a
    // property of the seeding rather than something the growth happens to preserve — which is exactly
    // why it is worth asserting at both quotas.
    for (let region = 0; region < options.size; region++) expect(contiguous(board, region)).toBe(true)
  })

  it("is seeded: the same seed draws the same sky, a different one draws another", () => {
    const options = config.expert
    expect(generateStarBattle(11, options)).toEqual(generateStarBattle(11, options))
    expect(generateStarBattle(11, options)).not.toEqual(generateStarBattle(12, options))
  })

  /**
   * The tier's own rung, spent its quota of times.
   *
   * A tier that never demands its rung teaches the tier below it. `grade` is the gate the offline pass
   * admitted this seed through, so asking it here is asking whether the board a room is dealt still
   * earns its place — and it answers exactly rather than allowing a near miss, because the fallback the
   * loop ships when no attempt meets the quota is a board `grade` returns null for.
   */
  it.each(tiers.filter(tier => config[tier].requires))("spends its own rung at %s", { timeout: 60_000 }, tier => {
    expect(gradeStarBattle(boardAt(config, tier), config[tier])).not.toBeNull()
  })

  /**
   * The region map is the whole clue, at every tier.
   *
   * A board carries no givens and no hatching — nothing but where the boundaries run — which is what the
   * family's first draft got wrong (design doc §4). A board that shipped anything else would be a board
   * doing some of the player's reasoning for them, so this guards the claim directly: the puzzle is a size,
   * a quota and a region map, and every square is the player's to fill.
   */
  it.each(tiers)("gives a %s board nothing but its region map", { timeout: 60_000 }, tier => {
    const options = config[tier]
    const board = boardAt(config, tier)
    expect(Object.keys(board).sort(), tier).toEqual(["quota", "regions", "size", "solution", "techniqueCap"])
    // Region sizes are spread rather than even, and that spread is what makes the map a clue at all.
    const sizes = [...Array(options.size).keys()].map(region => board.regions.filter(at => at === region).length)
    expect(Math.min(...sizes), `${tier} smallest region`).toBeLessThan(options.size)
    expect(Math.max(...sizes), `${tier} largest region`).toBeGreaterThan(options.size)
  })
})
