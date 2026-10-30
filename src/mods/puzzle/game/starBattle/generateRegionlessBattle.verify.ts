import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { techniquesUpTo } from "./generateStarBattle"
import { generateRegionlessBattle, gradeRegionlessBattle } from "./generateRegionlessBattle"
import { REGIONLESS_BATTLE_CONFIG } from "./regionlessConfig"
import { blankMarks } from "./starBattle"
import { REGIONLESS_TECHNIQUES, solveStarBattleByTechniques } from "./techniques"

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
})
