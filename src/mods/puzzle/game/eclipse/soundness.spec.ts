import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { mulberry32 } from "@/game/random"
import type { Mark } from "./eclipse"
import { ECLIPSE_CONFIG } from "./eclipseConfig"
import { generateEclipse, techniquesUpTo } from "./generateEclipse"
import { nextEclipseStep } from "./techniques"

/**
 * **The one invariant the whole family rests on: a rung never says something the answer disagrees with.**
 *
 * Generation only ever solves from the board it is about to ship, so it exercises one path per board. A
 * player reaches states generation never sees — the same marks in another order, or more of them — and a rung
 * that is wrong only there ships a puzzle that cannot be finished and a hint that lies. That is exactly what
 * happened: propagation inside `lineHypothesis` re-used a stale list of empty squares, invented a run of
 * three, and told the player a square was the mark it is not.
 */
describe("eclipse soundness", () => {
  it.each(difficulties)("never contradicts the answer on a %s board", { timeout: 120_000 }, difficulty => {
    for (let seed = 1; seed <= 3; seed++) {
      const board = generateEclipse(seed, ECLIPSE_CONFIG[difficulty])
      const random = mulberry32(seed * 31)
      for (let trial = 0; trial < 8; trial++) {
        // A state a player can be in: the givens, plus any subset of correct marks, in any order.
        const marks: (Mark | undefined)[] = board.given.map(
          (given, cell) => given ?? (random() < 0.4 ? board.solution[cell] : undefined)
        )
        for (let guard = 0; guard < 200; guard++) {
          const step = nextEclipseStep(board, marks, techniquesUpTo(board.techniqueCap))
          if (!step) break
          for (const decision of step.decisions) {
            expect({ ...decision, why: `${step.technique}.${step.variant ?? ""}` }).toEqual({
              ...decision,
              mark: board.solution[decision.cell],
              why: `${step.technique}.${step.variant ?? ""}`,
            })
            marks[decision.cell] = decision.mark
          }
        }
      }
    }
  })
})
