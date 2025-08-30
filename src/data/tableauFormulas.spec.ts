import { describe, expect, it } from "vitest"
import { generateTableaus } from "./tableaus"
import { difficulties } from "./difficultyLevels"
import { journeys, type TreasureTombJourney } from "./journeys"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { hashString } from "@/support/hashString"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"

describe("Tableau System", () => {
  // Generate tableaux once for all tests
  describe("test all tableau formula's", () => {
    const tableauLevels = generateTableaus()

    describe.each(difficulties)("%s difficulty tableaus", difficulty => {
      const journey = journeys.find(
        (j): j is TreasureTombJourney => j.type === "treasure_tomb" && j.difficulty === difficulty
      )!

      it.each(tableauLevels.filter(t => t.tombJourneyId === journey.id))(
        "creates solvable formulas for: $name",
        tableau => {
          expect(journey).toBeDefined()
          if (!journey) return

          const journeySeed = generateNewSeed(hashString(tableau.tombJourneyId), tableau.runNumber)
          const tableauSeed = generateNewSeed(journeySeed, tableau.levelNr)
          const random = mulberry32(tableauSeed)

          const settings = {
            amountSymbols: tableau.symbolCount,
            hieroglyphIds: tableau.inventoryIds,
            numberRange: journey.levelSettings.numberRange,
            operations: journey.levelSettings.operators,
          }
          expect(() => generateRewardCalculation(settings, random)).not.toThrow()
        }
      )
    })
  })
})
