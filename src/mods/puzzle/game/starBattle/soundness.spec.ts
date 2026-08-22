import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/game/random"
import type { Difficulty } from "@/data/difficultyLevels"
import { cellAt, neighboursOf, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { TWIN_STARS_CONFIG } from "./twinStars"
import { generateStarBattle, type StarBattleOptions, type StarBattlePuzzleWithAnswer } from "./generateStarBattle"
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

/**
 * The boards to hold to it, one per rule the mechanic ships.
 *
 * **The second quota is where this suite earns its keep.** Every rung is the same code at one star and at
 * two, so the two-star board is not new code being tested — it is the same code asked a question it was
 * never run against, and a counting rung that quietly assumed "one" would pass every other spec in this
 * folder.
 */
const AGREEMENT: { name: string; options: StarBattleOptions }[] = [
  ...TIERS.map(tier => ({ name: `star battle ${tier}`, options: STAR_BATTLE_CONFIG[tier] })),
  ...(["junior", "expert", "master", "wizard"] as Difficulty[]).map(tier => ({
    name: `twin stars ${tier}`,
    options: TWIN_STARS_CONFIG[tier],
  })),
]

/** A state a player could actually be in: some of the answer's stars, and some correct dark marks. */
const playerState = (board: StarBattlePuzzleWithAnswer, random: () => number): Marks => {
  const stars = random()
  const darks = random()
  return board.solution.map(star => {
    if (star) return random() < stars ? "star" : undefined
    return random() < darks ? "dark" : undefined
  })
}

/**
 * Every legal star set that agrees with what is on the board — the oracle a forced step is held to.
 *
 * Checking a decision against the ANSWER only proves the rung is not lying about this board. Checking it
 * against every completion proves the step was FORCED, which is the claim a hint makes and the claim
 * uniqueness rests on.
 *
 * Walks the rows and takes each row's stars as a COMBINATION, so it enumerates at either quota — the quota
 * is what makes a row's choice one square or several, and every other rule reads the same way round.
 */
const completions = (puzzle: StarBattlePuzzle, marks: Marks, limit: number): number[][] => {
  const { size, quota } = puzzle
  const found: number[][] = []
  const taken: number[] = []
  const inColumn = new Array(size).fill(0)
  const inRegion = new Array(size).fill(0)
  const walk = (row: number) => {
    if (found.length >= limit) return
    if (row === size) {
      found.push([...taken])
      return
    }
    const cells = Array.from({ length: size }, (_unused, col) => cellAt(size, row, col))
    // Stars the player already wrote down are part of the state, so a completion that leaves one out is a
    // completion of a different board.
    const written = cells.filter(cell => marks[cell] === "star")
    const from = taken.length
    const choose = (col: number, owed: number) => {
      if (found.length >= limit) return
      if (owed === 0) {
        if (written.every(cell => taken.slice(from).includes(cell))) walk(row + 1)
        return
      }
      for (let at = col; at < size; at++) {
        const cell = cells[at]
        if (marks[cell] === "dark") continue
        if (inColumn[at] === quota || inRegion[puzzle.regions[cell]] === quota) continue
        if (taken.some(other => neighboursOf(size, cell).includes(other))) continue
        taken.push(cell)
        inColumn[at]++
        inRegion[puzzle.regions[cell]]++
        choose(at + 1, owed - 1)
        taken.pop()
        inColumn[at]--
        inRegion[puzzle.regions[cell]]--
      }
    }
    choose(0, quota)
  }
  walk(0)
  return found
}

describe("star battle soundness", () => {
  it.each(AGREEMENT)(
    "every rung agrees with the answer from any state a player reaches at $name",
    { timeout: 60_000 },
    ({ options }) => {
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
                `seed ${seed} ${step.technique}${step.variant ? `.${step.variant}` : ""} on cell ${decision.cell}`
              ).toBe(true)
        }
      }
    }
  )

  /**
   * The stronger reading of the same rule, on the boards small enough to enumerate: a rung's decision has to
   * hold in EVERY legal completion of the state it fired from, not merely in the answer the board shipped
   * with. That is what makes a step forced rather than lucky.
   *
   * Twin stars is enumerated at its own grid rather than a smaller one, because it has no smaller one — 8×8
   * is where its rule starts having boards. Its state space is what caps the rounds here, not its risk.
   */
  it.each([
    { name: "star battle starter", options: STAR_BATTLE_CONFIG.starter, seeds: [1, 2, 3, 4], rounds: 25 },
    { name: "star battle junior", options: STAR_BATTLE_CONFIG.junior, seeds: [1, 2, 3, 4], rounds: 25 },
    // Junior first: it is the tier `onlyWay` carries, and a rung that places two stars at once on an
    // argument about arrangements is the one this oracle is most worth pointing at.
    { name: "twin stars junior", options: TWIN_STARS_CONFIG.junior, seeds: [1, 2], rounds: 12 },
    { name: "twin stars expert", options: TWIN_STARS_CONFIG.expert, seeds: [1, 2], rounds: 12 },
  ])("every rung is forced by the board it fired from at $name", { timeout: 120_000 }, ({ options, seeds, rounds }) => {
    const random = mulberry32(4241)
    let checked = 0
    for (const seed of seeds) {
      const board = generateStarBattle(seed, options)
      for (let round = 0; round < rounds; round++) {
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
            expect(holds, `seed ${seed} ${technique} on cell ${decision.cell}, ${ways.length} ways`).toBe(true)
            checked++
          }
        }
      }
    }
    // A test that silently exercised nothing is not a guard.
    expect(checked).toBeGreaterThan(100)
  })
})
