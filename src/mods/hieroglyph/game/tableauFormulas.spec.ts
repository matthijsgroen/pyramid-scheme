import { describe, expect, it } from "vitest"
import { generateTableaus } from "@/mods/hieroglyph/game/tableaus"
import { difficulties } from "@/data/difficultyLevels"
import { journeys } from "@/data/journeys"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { hashString } from "@/support/hashString"
import { generateRewardCalculation } from "./generateRewardCalculation"
import { tombFormulaFor } from "./tombFormula"

describe("Tableau System", () => {
  // Generate tableaux once for all tests
  describe("test all tableau formula's", () => {
    const tableauLevels = generateTableaus()

    describe.each(difficulties)("%s difficulty tableaus", difficulty => {
      const journey = journeys.find(j => j.exterior === "tomb" && j.difficulty === difficulty)!

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
            numberRange: tombFormulaFor(journey.id).numberRange,
            operations: tombFormulaFor(journey.id).operators,
          }
          expect(() => generateRewardCalculation(settings, random)).not.toThrow()
        }
      )
    })
  })
})
