import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/game/random"
import type { Difficulty } from "@/data/difficultyLevels"
import { cellAt, colOf, neighboursOf, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { generateStarBattle, type StarBattlePuzzleWithAnswer } from "./generateStarBattle"
import { applyStarBattleTechniques, nextStarBattleStep, STAR_BATTLE_TECHNIQUES, type Marks } from "./techniques"

/**
 * The guard on §3.3 of the design doc: **a rung must never say something the answer disagrees with, from any
 * state a player can be in.**
 *
 * Generation solves each board once, along one path, so it only exercises the states that path visits. A
 * player reaches states it never sees — the same marks in a different order, or more of them. A rung that is
 * wrong only there ships a board that cannot be finished and a hint that lies.
 *
 * This family needs the guard more than eclipse does, because two of its rungs reason about SETS of groups
 * rather than one line. The bug it is written against is real and was found in the throwaway probe: a cover
 * built from rows AND columns at once counts each star twice, so the quota arithmetic agrees on boards it has
 * no business deciding, and boards settled to answers that broke the adjacency rule.
 */
const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

/** A state a player could actually be in: some of the answer's stars, and some correct dark marks. */
const playerState = (board: StarBattlePuzzleWithAnswer, random: () => number): Marks => {
  const stars = random()
  const darks = random()
  return board.solution.map((star, cell) => {
    if (board.blocked[cell]) return "dark"
    if (star) return random() < stars ? "star" : undefined
    return random() < darks ? "dark" : undefined
  })
}

/**
 * Every legal star set that agrees with what is on the board — the oracle a forced step is held to.
 *
 * Checking a decision against the ANSWER only proves the rung is not lying about this board. Checking it
 * against every completion proves the step was FORCED, which is the claim a hint makes and the claim
 * uniqueness rests on. Only the shipped one-star-a-line form is enumerated; a wider quota is §10.3.
 */
const completions = (puzzle: StarBattlePuzzle, marks: Marks, limit: number): number[][] => {
  const { size } = puzzle
  const found: number[][] = []
  const taken: number[] = []
  const walk = (row: number) => {
    if (found.length >= limit) return
    if (row === size) {
      found.push([...taken])
      return
    }
    for (let col = 0; col < size; col++) {
      const cell = cellAt(size, row, col)
      if (puzzle.blocked[cell] || marks[cell] === "dark") continue
      if (taken.some(at => colOf(size, at) === col)) continue
      if (taken.some(at => puzzle.regions[at] === puzzle.regions[cell])) continue
      if (taken.some(at => neighboursOf(size, cell).includes(at))) continue
      // A star the player already wrote down fixes its row: no other square in it may be chosen.
      const fixed = Array.from({ length: size }, (_unused, at) => cellAt(size, row, at)).find(
        at => marks[at] === "star"
      )
      if (fixed !== undefined && fixed !== cell) continue
      taken.push(cell)
      walk(row + 1)
      taken.pop()
    }
  }
  walk(0)
  return found
}

describe("star battle soundness", () => {
  it.each(TIERS)(
    "every rung agrees with the answer from any state a player reaches at %s",
    { timeout: 60_000 },
    tier => {
      const options = STAR_BATTLE_CONFIG[tier]
      const random = mulberry32(7717)
      for (const seed of [1, 2, 3]) {
        const board = generateStarBattle(seed, options)
        for (let round = 0; round < 40; round++) {
          const marks = playerState(board, random)
          const steps = applyStarBattleTechniques(board, marks)
          for (const step of steps)
            for (const decision of step.decisions)
              expect(
                decision.mark === "star" ? board.solution[decision.cell] : !board.solution[decision.cell],
                `${tier} seed ${seed} ${step.technique}${step.variant ? `.${step.variant}` : ""} on cell ${decision.cell}`
              ).toBe(true)
        }
      }
    }
  )

  /**
   * The stronger reading of the same rule, on the two sizes small enough to enumerate: a rung's decision has
   * to hold in EVERY legal completion of the state it fired from, not merely in the answer the board shipped
   * with. That is what makes a step forced rather than lucky.
   */
  it.each(["starter", "junior"] as Difficulty[])(
    "every rung is forced by the board it fired from at %s",
    { timeout: 60_000 },
    tier => {
      const options = STAR_BATTLE_CONFIG[tier]
      const random = mulberry32(4241)
      let checked = 0
      for (const seed of [1, 2, 3, 4]) {
        const board = generateStarBattle(seed, options)
        for (let round = 0; round < 25; round++) {
          const marks = playerState(board, random)
          const ways = completions(board, marks, 60)
          // A state the player has already broken has nothing to be forced about.
          if (!ways.length) continue
          for (const technique of STAR_BATTLE_TECHNIQUES) {
            const step = nextStarBattleStep(board, [...marks], [technique])
            if (!step) continue
            for (const decision of step.decisions) {
              const holds = ways.every(way =>
                decision.mark === "star" ? way.includes(decision.cell) : !way.includes(decision.cell)
              )
              expect(holds, `${tier} seed ${seed} ${technique} on cell ${decision.cell}, ${ways.length} ways`).toBe(
                true
              )
              checked++
            }
          }
        }
      }
      // A test that silently exercised nothing is not a guard.
      expect(checked).toBeGreaterThan(100)
    }
  )
})
