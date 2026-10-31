import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { mulberry32 } from "@/game/random"
import { techniquesUpTo } from "./generateStarBattle"
import { generateRegionlessBattle, gradeRegionlessBattle } from "./generateRegionlessBattle"
import { REGIONLESS_BATTLE_CONFIG } from "./regionlessConfig"
import { completions, holdsIn, walledState } from "./soundnessOracle"
import { blankMarks } from "./starBattle"
import {
  applyStarBattleTechniques,
  nextStarBattleStep,
  REGIONLESS_TECHNIQUES,
  solveStarBattleByTechniques,
} from "./techniques"

const TIERS: Difficulty[] = ["expert", "master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

describe.each(TIERS)("regionless battle at %s", tier => {
  const options = REGIONLESS_BATTLE_CONFIG[tier]
  const boards = SEEDS.map(seed => generateRegionlessBattle(seed, options))

  it("settles every board under the tier's ladder from its blank marks", () => {
    for (const board of boards) {
      expect(blankMarks(board).filter(Boolean).length).toBe(board.walls!.filter(Boolean).length)
      const result = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap, REGIONLESS_TECHNIQUES))
      expect(result.settled).toBe(true)
      expect(result.marks.map(mark => mark === "star")).toEqual([...board.solution])
    }
  })

  it("keeps walls within the tier's share and off the answer", () => {
    for (const board of boards) {
      expect(board.regions).toBeUndefined()
      expect(board.walls!.filter(Boolean).length).toBeLessThanOrEqual(options.maxWallShare * options.size ** 2)
      board.walls!.forEach((wall, cell) => {
        if (wall) expect(board.solution[cell]).toBe(false)
      })
    }
  })

  it("grades every board", () => {
    for (const board of boards) expect(gradeRegionlessBattle(board, options)).not.toBeNull()
  })

  it("every regionless rung agrees with the answer from any state a player reaches", () => {
    const random = mulberry32(3307)
    let fired = 0
    for (const [seed, board] of boards.entries()) {
      for (let round = 0; round < 40; round++) {
        for (const step of applyStarBattleTechniques(board, walledState(board, random), REGIONLESS_TECHNIQUES)) {
          for (const decision of step.decisions) {
            fired++
            expect(
              decision.mark === "star" ? board.solution[decision.cell] : !board.solution[decision.cell],
              `seed ${SEEDS[seed]} ${step.technique}.${step.variant} on cell ${decision.cell}`
            ).toBe(true)
          }
        }
      }
    }
    expect(fired).toBeGreaterThan(0)
  })

  // A 9×9 board has too many completions from a sparse state to enumerate.
  it.skipIf(tier === "wizard")("every regionless rung is forced by the board it fired from", () => {
    const random = mulberry32(6619)
    let checked = 0
    for (const [seed, board] of boards.entries()) {
      for (let round = 0; round < 30; round++) {
        const marks = walledState(board, random)
        const ways = completions(board, marks, 200)
        if (!ways.length) continue
        for (const technique of REGIONLESS_TECHNIQUES) {
          const step = nextStarBattleStep(board, [...marks], [technique])
          if (!step) continue
          for (const decision of step.decisions) {
            expect(
              ways.every(way => holdsIn(way, decision)),
              `seed ${SEEDS[seed]} ${technique} on cell ${decision.cell}`
            ).toBe(true)
            checked++
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20)
  })
})
