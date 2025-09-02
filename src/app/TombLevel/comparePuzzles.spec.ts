import { difficulties } from "@/data/difficultyLevels"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { tableauLevels } from "@/data/tableaus"
import { generateCompareLevel } from "@/game/generateCompareLevel"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { hashString } from "@/support/hashString"
import { describe, expect, it } from "vitest"

describe("comparePuzzles", () => {
  describe.each(difficulties)("%s", difficulty => {
    const tombPuzzle = journeys.find(
      (j): j is TreasureTombJourney => j.type === "treasure_tomb" && j.difficulty === difficulty
    )!

    it.each(tombPuzzle.treasures.map<number>((_t, i) => i))("produces a valid puzzle for run %d", runNumber => {
      if (tombPuzzle.levelSettings.compareAmount === 0) return
      const levelSeed = generateNewSeed(hashString(tombPuzzle.id), runNumber + 1) + (runNumber + 1) * 3210

      const random = mulberry32(levelSeed)
      const tableau = tableauLevels.find(t => t.tombJourneyId === tombPuzzle.id && t.runNumber === runNumber)
      const digit = Math.round(random() * 9)
      const always = random() > 0.5
      const result = generateCompareLevel(
        {
          compareAmount: tombPuzzle.levelSettings.compareAmount,
          numberOfSymbols: tableau?.symbolCount ?? 2,
          numberRange: tombPuzzle.levelSettings.numberRange,
          operators: tombPuzzle.levelSettings.operators,
        },
        { digit, largest: always ? "always" : "never" },
        random
      )
      expect(result).toBeDefined()
    })
  })
})
