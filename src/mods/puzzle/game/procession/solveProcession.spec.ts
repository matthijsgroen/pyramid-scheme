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
   * **Every rung the solver claims is a rung something actually needs** (`puzzle-screens.md` §7). A rung
   * nothing reaches is a rung nobody has debugged.
   *
   * Three of the four are what the shipped tiers ask for. **`chain` is deliberately not one of them**: a
   * board whose every bar is fixed by a pin or a link off one is a board the player is told rather than one
   * they work out, which stopped being acceptable the moment each mark said itself in words
   * (`procession.md` §3). It stays a rung because the ladder has to start somewhere and the hint wording
   * keys on it — the board below is what keeps it honest.
   */
  it("has a tier whose shipped board needs each rung above the floor", () => {
    const reached = new Set<Rung>()
    for (const tier of ["starter", "junior", "expert", "master", "wizard"] as const)
      reached.add(requiredRung(shipped(tier))!.rung)
    expect([...reached].sort()).toEqual(["apart", "split", "squeeze"])
    expect(reached.has("chain")).toBe(false)
  })

  it("still settles a told board at the chain rung, which no tier ships", () => {
    const told: ProcessionPuzzle = {
      ticks: 8,
      bars: [
        { len: 3, start: 2 },
        { len: 2, start: 0 },
      ],
      marks: [
        { kind: "pin", a: 0, tick: 0 },
        { kind: "link", a: 0, b: 1, gap: 1 },
      ],
    }
    expect(requiredRung(told)?.rung).toBe("chain")
    expect(deduce(told, "chain").starts).toEqual([0, 4])
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
