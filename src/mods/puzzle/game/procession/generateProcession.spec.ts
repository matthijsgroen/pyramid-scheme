import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { generateProcession, gradeProcession } from "./generateProcession"
import { PROCESSION_CONFIG } from "./processionConfig"
import { countArrangements, requiredRung, RUNGS } from "./solveProcession"
import { createProcessionState, processionSolved, type ProcessionPuzzle } from "./procession"

const TIERS = ["starter", "junior", "expert", "master", "wizard"] as const

/**
 * The board a room is dealt, built the way play time builds it: the shipped seed, one attempt, no loop
 * (`docs/instructions/puzzle-screens.md` §6.1). Searching for fresh boards here would test a path only the
 * puzzle lab takes, and pay for it in seconds a tier.
 */
const shipped = (tier: Difficulty): ProcessionPuzzle => {
  const options = PROCESSION_CONFIG[tier]
  const seeds = puzzleSeeds[configHash(options)]
  expect(seeds?.length, `no shipped seeds for ${tier} — run yarn generate-seeds`).toBeGreaterThan(0)
  return generateProcession(seeds[0], options, 1)
}

describe("rolling a day", () => {
  it.each(TIERS)("builds a %s board its own gate accepts", tier => {
    const options = PROCESSION_CONFIG[tier]
    const puzzle = shipped(tier)
    const grade = gradeProcession(puzzle, options)
    expect(grade, `${tier} board misses its own gate`).not.toBeNull()
    expect(grade!.deepest).toBe(options.minRung)
    expect(puzzle.bars).toHaveLength(options.bars)
    expect(puzzle.ticks).toBe(options.ticks)
    expect(puzzle.bars.every(bar => bar.len >= options.minLen && bar.len <= options.maxLen)).toBe(true)
    // Every bar stands inside the day, on the tick it opens on as much as on the one it answers to.
    expect(puzzle.bars.every(bar => bar.start >= 0 && bar.start + bar.len <= puzzle.ticks)).toBe(true)
    expect(puzzle.marks.every(mark => options.kinds.includes(mark.kind))).toBe(true)
  })

  it.each(TIERS)("opens a %s board unsolved, and with exactly one way to finish it", tier => {
    const puzzle = shipped(tier)
    expect(processionSolved(puzzle, createProcessionState(puzzle))).toBe(false)
    expect(countArrangements(puzzle, 3)).toBe(1)
  })

  it("makes each tier ask for at least as much as the one below it", () => {
    const rungs = TIERS.map(tier => RUNGS.indexOf(requiredRung(shipped(tier))!.rung))
    expect(rungs).toEqual([...rungs].sort((one, two) => one - two))
  })

  /**
   * **`grade` is the gate, so it has to refuse what the gate refuses** — the offline pass admits a seed on
   * `grade` alone (`familyMeta.ts`'s `seedable`).
   */
  it("refuses a board that is too easy for the tier, and one that opens solved", () => {
    const options = PROCESSION_CONFIG.wizard
    const easy: ProcessionPuzzle = {
      ticks: 8,
      bars: [
        { len: 2, start: 3 },
        { len: 2, start: 0 },
      ],
      marks: [
        { kind: "pin", a: 0, tick: 0 },
        { kind: "pin", a: 1, tick: 4 },
      ],
    }
    expect(gradeProcession(easy, options)).toBeNull()
    expect(gradeProcession(easy, { ...options, minRung: "chain", maxRung: "chain", minSplits: 0 })?.deepest).toBe(
      "chain"
    )
    const opensSolved = {
      ...easy,
      bars: [
        { len: 2, start: 0 },
        { len: 2, start: 4 },
      ],
    }
    expect(gradeProcession(opensSolved, { ...options, minRung: "chain", maxRung: "chain", minSplits: 0 })).toBeNull()
  })

  it("refuses a board with more than one arrangement", () => {
    const loose: ProcessionPuzzle = {
      ticks: 8,
      bars: [
        { len: 2, start: 3 },
        { len: 2, start: 0 },
      ],
      marks: [{ kind: "before", a: 0, b: 1 }],
    }
    expect(gradeProcession(loose, { ...PROCESSION_CONFIG.starter, minSplits: 0 })).toBeNull()
  })
})
