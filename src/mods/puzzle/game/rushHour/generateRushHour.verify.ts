import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { generateRushHour, gradeRushHour } from "./generateRushHour"
import { RUSH_HOUR_CONFIG } from "./rushHourConfig"
import { cellsOf, createRushHourState, rushHourSolved, type RushHourPuzzle } from "./rushHour"
import { optimalPath } from "./solveRushHour"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"

/**
 * Every board the generator would ship, checked against the two things a shipped board has to be: gettable
 * out at all, and gettable out in as many moves as its tier says.
 *
 * **Scanned the way the offline pass scans** (`docs/instructions/puzzle-screens.md` §6.1) — one attempt a
 * seed, misses skipped — because that is the only search whose result is what players get. Asking the
 * generator for its full loop here would test a path only the puzzle lab takes.
 */
const scan = (tier: Difficulty, seeds: number) => {
  const options = RUSH_HOUR_CONFIG[tier]
  const kept: { puzzle: RushHourPuzzle; steps: number }[] = []
  for (let seed = 1; seed <= seeds; seed++) {
    let puzzle
    try {
      puzzle = generateRushHour(seed, options, 1)
    } catch {
      continue
    }
    const grade = gradeRushHour(puzzle, options)
    if (grade) kept.push({ puzzle, steps: grade.steps })
  }
  return kept
}

/** Nothing shares a cell — walls included, since a piece standing on one hides it and then cannot move back. */
const noOverlap = (puzzle: RushHourPuzzle) => {
  const seen = new Set<number>(puzzle.walls ?? [])
  for (const piece of puzzle.pieces)
    for (const cell of cellsOf(puzzle.size, piece, piece.offset)) {
      if (seen.has(cell)) return false
      seen.add(cell)
    }
  return true
}

describe("generating a blockade", () => {
  // The three tiers a spec can afford to search for itself, with windows sized off the measured hit rate
  // (family doc §3.2). Master and wizard cost seconds a seed and are covered by the shipped seeds instead —
  // see the test below, which is the same board a room actually opens.
  it.each([
    ["starter", 6],
    ["junior", 6],
    ["expert", 4],
  ] as const)("draws %s boards inside their band, all solvable", { timeout: 120_000 }, (tier, seeds) => {
    const kept = scan(tier, seeds)
    expect(kept.length, `no ${tier} board in ${seeds} seeds`).toBeGreaterThan(0)
    const options = RUSH_HOUR_CONFIG[tier]
    for (const { puzzle, steps } of kept) {
      expect(steps).toBeGreaterThanOrEqual(options.minMoves)
      expect(steps).toBeLessThanOrEqual(options.maxMoves)
      // A board that starts solved is not a board, and one drawn on top of itself is not a position.
      expect(rushHourSolved(puzzle, createRushHourState(puzzle))).toBe(false)
      expect(noOverlap(puzzle)).toBe(true)
      expect(puzzle.pieces.length).toBeLessThanOrEqual(options.pieces)
      // The player's piece is index 0, horizontal, and the only horizontal piece in its own lane — a
      // second one there could never be got out of the way (the generator's own note).
      expect(puzzle.pieces[0].horizontal).toBe(true)
      expect(puzzle.pieces.filter(piece => piece.horizontal && piece.lane === puzzle.pieces[0].lane)).toHaveLength(1)
    }
  })

  /**
   * **The deep tiers are checked on the boards that ship, not on a fresh search.** A wizard seed costs about
   * four seconds to build, so searching for one here would put the offline pass inside the test suite; the
   * shipped list already holds seeds proven to build in one attempt, and re-grading one is the same
   * assertion for a fraction of the work.
   */
  it.each(["master", "wizard"] as const)("builds its shipped %s board inside the band", { timeout: 60_000 }, tier => {
    const options = RUSH_HOUR_CONFIG[tier]
    const seeds = puzzleSeeds[configHash(options)]
    expect(seeds?.length, `no shipped seeds for ${tier} — run yarn generate-seeds`).toBeGreaterThan(0)
    const puzzle = generateRushHour(seeds[0], options, 1)
    expect(gradeRushHour(puzzle, options)?.steps).toBeGreaterThanOrEqual(options.minMoves)
    expect(puzzle.pieces.length).toBeLessThanOrEqual(options.pieces)
    expect(puzzle.walls?.length ?? 0).toBe(options.walls)
  })

  /**
   * **`grade` is the gate, so it has to refuse what the gate refuses.** The offline pass admits a seed on
   * `grade` alone, and this family's nearest-miss fallback means a board coming back is no proof it was
   * accepted — exactly the drift `seedable`'s note warns about.
   */
  it("refuses a board whose way out is shorter than the band asks", () => {
    const options = RUSH_HOUR_CONFIG.wizard
    const easy: RushHourPuzzle = {
      size: 6,
      pieces: [
        { lane: 1, offset: 2, len: 2, horizontal: true },
        { lane: 5, offset: 3, len: 2, horizontal: false },
      ],
    }
    expect(optimalPath(easy, createRushHourState(easy))?.length).toBe(1)
    expect(gradeRushHour(easy, options)).toBeNull()
    expect(gradeRushHour(easy, { ...options, minMoves: 1, maxMoves: 2 })).toEqual({ steps: 1 })
  })
})
