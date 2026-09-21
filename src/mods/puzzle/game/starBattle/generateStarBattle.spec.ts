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
   * The two gates that took this family's gifts away (docs/game-design/puzzles/star-battle.md, "The three gates").
   *
   * A region inside one row spends that row before the player has read anything, and a board whose first
   * star lands on step 0 opened itself. Both were true of every 8×8 this generator kept until the tiers
   * asked otherwise.
   */
  it.each(tiers.filter(tier => config[tier].noLineRegions))(
    "draws every %s region across two rows and two columns",
    { timeout: 60_000 },
    tier => {
      const board = boardAt(config, tier)
      for (let region = 0; region < board.size; region++) {
        const cells = board.regions.flatMap((at, cell) => (at === region ? [cell] : []))
        expect(
          new Set(cells.map(cell => Math.floor(cell / board.size))).size,
          `${tier} region ${region}`
        ).toBeGreaterThan(1)
        expect(new Set(cells.map(cell => cell % board.size)).size, `${tier} region ${region}`).toBeGreaterThan(1)
      }
    }
  )

  it.each(tiers.filter(tier => config[tier].firstStarAfter))(
    "makes a %s board eliminate before it hands over a star",
    { timeout: 60_000 },
    tier => {
      const options = config[tier]
      const board = boardAt(config, tier)
      const { steps } = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap))
      const first = steps.findIndex(step => step.decisions.some(decision => decision.mark === "star"))
      expect(first, tier).toBeGreaterThanOrEqual(options.firstStarAfter!)
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

/**
 * A SEED HAS TO MEAN THE SAME BOARD ON EVERY ENGINE, or the proven list is only proven on the machine
 * that proved it. `yarn generate-seeds` and `yarn verify-seeds` both run on node, so nothing else here
 * can notice a generator that draws differently under a different `Array.prototype.sort`.
 *
 * It did. `growRegions` broke ties with `random() - 0.5` INSIDE the comparator, so how many times the
 * seeded stream advanced depended on how many comparisons the sort made — V8 sorts with TimSort,
 * JavaScriptCore with a merge sort. 17 of this family's 42 proven seeds failed to build under a merge
 * sort, which on a phone is a room that cannot be entered.
 */
describe("a board does not depend on the engine's sort", () => {
  // A perfectly legal sort, just not this engine's. Stable, correct, different comparison order.
  const mergeSort = function <T>(this: T[], compare?: (a: T, b: T) => number): T[] {
    const cmp = compare ?? ((a: T, b: T) => (String(a) < String(b) ? -1 : 1))
    const sorted = (items: T[]): T[] => {
      if (items.length < 2) return items
      const mid = items.length >> 1
      const left = sorted(items.slice(0, mid))
      const right = sorted(items.slice(mid))
      const out: T[] = []
      let i = 0
      let j = 0
      while (i < left.length && j < right.length) out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++])
      return out.concat(left.slice(i), right.slice(j))
    }
    const result = sorted([...this])
    for (let index = 0; index < result.length; index++) this[index] = result[index]
    return this
  }

  const underMergeSort = <T>(run: () => T): T => {
    const original = Array.prototype.sort
    Array.prototype.sort = mergeSort as typeof Array.prototype.sort
    try {
      return run()
    } finally {
      Array.prototype.sort = original
    }
  }

  // Generating a wizard board twice — once through a merge sort written in TypeScript rather than the
  // engine's own — runs to about three seconds here and past the five-second default on a CI runner.
  it.each(["junior", "expert", "master", "wizard"] as const)(
    "builds the same twin stars board at %s",
    tier => {
      const options = TWIN_STARS_CONFIG[tier]
      const ours = generateStarBattle(12345, options)
      const theirs = underMergeSort(() => generateStarBattle(12345, options))

      expect(theirs.regions).toEqual(ours.regions)
      expect(theirs.solution).toEqual(ours.solution)
    },
    30_000
  )

  it("builds every listed board of a tier under either sort, which is what the list promises", () => {
    const options = TWIN_STARS_CONFIG.expert
    const listed = puzzleSeeds[configHash(options)] ?? []
    expect(listed.length).toBeGreaterThan(0)

    const broken = underMergeSort(() =>
      listed.filter(seed => {
        try {
          generateStarBattle(seed, options, 1)
          return false
        } catch {
          return true
        }
      })
    )

    expect(broken).toEqual([])
  }, 120_000)
})
