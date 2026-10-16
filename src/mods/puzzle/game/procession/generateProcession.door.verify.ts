import { describe, expect, it } from "vitest"
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

const pairs = PROCESSION_DOOR_STEPS.map(steps => [steps] as const)

describe("a procession door's board", () => {
  it.each(pairs)("with %i steps, at any tier, has one answer, distinct starts, and reads as processionOrder", steps => {
    const options = processionOptions("starter", doorVariant(steps))
    const [found] = findSeeds(
      PROCESSION_META.seedable!,
      PROCESSION_META.seedable!.resolveOptions({
        difficulty: "starter",
        variant: doorVariant(steps),
      }),
      0,
      2000
    )
    expect(found).toBeDefined()
    const puzzle = generateProcession(found!.seed, options, 1)
    expect(puzzle.bars).toHaveLength(steps)
    const answers = everyAnswer(puzzle)
    expect(answers).toHaveLength(1)
    const [answer] = answers
    expect(new Set(answer).size).toBe(steps)
    const byStart = answer.map((_, bar) => bar).sort((one, two) => answer[one] - answer[two])
    expect(processionOrder(puzzle)).toEqual(byStart)
  })
})
