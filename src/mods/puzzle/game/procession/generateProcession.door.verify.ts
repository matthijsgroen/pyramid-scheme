import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { findSeeds } from "@/game/seeds/findSeeds"
import { generateProcession } from "./generateProcession"
import { PROCESSION_META } from "./meta"
import { markHolds, processionOrder, type ProcessionPuzzle } from "./procession"
import { doorVariant, PROCESSION_DOOR_STEPS, processionOptions } from "./processionConfig"

/** Every arrangement whose marks all hold, by trying them all: no propagation, so the solver judges nothing. */
const everyAnswer = (puzzle: ProcessionPuzzle): number[][] => {
  const answers: number[][] = []
  const starts: number[] = []
  const place = (bar: number) => {
    if (bar === puzzle.bars.length) {
      if (puzzle.marks.every(mark => markHolds(puzzle, starts, mark))) answers.push([...starts])
      return
    }
    for (let tick = 0; tick + puzzle.bars[bar].len <= puzzle.ticks; tick++) {
      starts[bar] = tick
      place(bar + 1)
    }
  }
  place(0)
  return answers
}

const pairs = difficulties.flatMap(tier => PROCESSION_DOOR_STEPS.map(steps => [tier, steps] as const))

describe("a procession door's board", () => {
  it.each(pairs)("at %s with %i steps has one answer, distinct starts, and reads as processionOrder", (tier, steps) => {
    const options = processionOptions(tier, doorVariant(steps))
    const [found] = findSeeds(
      PROCESSION_META.seedable!,
      PROCESSION_META.seedable!.resolveOptions({
        difficulty: tier,
        variant: doorVariant(steps),
      }),
      0,
      2000
    )
    if (!found) return // no seed: the bake refuses this pair (processionBoardUnseeded)
    const puzzle = generateProcession(found.seed, options, 1)
    expect(puzzle.bars).toHaveLength(steps)
    const answers = everyAnswer(puzzle)
    expect(answers).toHaveLength(1)
    const [answer] = answers
    expect(new Set(answer).size).toBe(steps)
    const byStart = answer.map((_, bar) => bar).sort((one, two) => answer[one] - answer[two])
    expect(processionOrder(puzzle)).toEqual(byStart)
  })
})
