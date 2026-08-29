import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { generateProcession } from "./generateProcession"
import { PROCESSION_CONFIG } from "./processionConfig"
import { countArrangements, deduce, requiredRung, RUNGS, type Rung } from "./solveProcession"
import { markHolds, type ProcessionPuzzle } from "./procession"

/** The board a room actually opens at this tier — the first seed the offline pass admitted. */
const shipped = (tier: Difficulty): ProcessionPuzzle => {
  const options = PROCESSION_CONFIG[tier]
  const seeds = puzzleSeeds[configHash(options)]
  expect(seeds?.length, `no shipped seeds for ${tier} — run yarn generate-seeds`).toBeGreaterThan(0)
  return generateProcession(seeds[0], options, 1)
}

describe("the ladder", () => {
  /**
   * **Every rung the solver claims is a rung some tier's boards actually need** (`puzzle-screens.md` §7).
   * A rung nothing reaches is a rung nobody has debugged, and the family doc would be describing a
   * technique the player never meets.
   */
  it("has a tier whose shipped board needs each rung", () => {
    const reached = new Set<Rung>()
    for (const tier of ["starter", "junior", "expert", "master", "wizard"] as const)
      reached.add(requiredRung(shipped(tier))!.rung)
    expect([...RUNGS].every(rung => reached.has(rung))).toBe(true)
  })

  it("settles each shipped board, and its answer satisfies every mark", () => {
    for (const tier of ["starter", "junior", "expert", "master", "wizard"] as const) {
      const puzzle = shipped(tier)
      const ladder = requiredRung(puzzle)!
      expect(
        puzzle.marks.every(mark => markHolds(puzzle, ladder.starts, mark)),
        tier
      ).toBe(true)
      expect(countArrangements(puzzle, 3), tier).toBe(1)
    }
  })

  /**
   * **A weaker rung must genuinely fail**, or the board is filed above the tier it belongs to. This is the
   * claim the whole ladder rests on: `requiredRung` returns the WEAKEST rung that settles a board, so the
   * one below it has to leave something unknown.
   */
  it("cannot settle a board with the rung below the one it needs", () => {
    for (const tier of ["junior", "expert", "master", "wizard"] as const) {
      const puzzle = shipped(tier)
      const needed = RUNGS.indexOf(requiredRung(puzzle)!.rung)
      expect(deduce(puzzle, RUNGS[needed - 1]).determined, tier).toBe(false)
    }
  })

  it("counts both arrangements when a mark is taken away", () => {
    const puzzle = shipped("starter")
    const loosened = { ...puzzle, marks: puzzle.marks.filter(mark => mark.kind !== "pin") }
    // Nothing pins the day any more, so it slides along the track — which is what the generator's
    // thinning pass is really testing for when it asks for uniqueness.
    expect(countArrangements(loosened, 5)).toBeGreaterThan(1)
  })

  it("strikes a start no arrangement could use", () => {
    // A four-tick day, two two-tick bars that may not overlap: each has exactly one place, and neither
    // needs a pin to say so.
    const tight: ProcessionPuzzle = {
      ticks: 4,
      bars: [
        { len: 2, start: 0 },
        { len: 2, start: 0 },
      ],
      marks: [
        { kind: "apart", a: 0, b: 1 },
        { kind: "before", a: 0, b: 1 },
      ],
    }
    expect(deduce(tight, "squeeze").starts).toEqual([0, 2])
  })
})
