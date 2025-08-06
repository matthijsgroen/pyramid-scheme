import {
  journeySeedGenerator,
  type JourneyState,
} from "@/app/state/useJourneys"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { tableauLevels } from "@/data/tableaus"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import { generateNewSeed, mulberry32 } from "@/game/random"

const difficultyCompare = (a: Difficulty, b: Difficulty): number =>
  difficulties.indexOf(a) - difficulties.indexOf(b)

/**
 * Determines if player should receive an inventory item based on current available tomb runs.
 * This focuses on items needed for the next available runs of each treasure tomb.
 */
export const determineInventoryLootForCurrentRuns = (
  pyramidExpedition: JourneyState,
  journeyLog: Array<{ journeyId: string; completed: boolean; levelNr: number }>,
  playerInventory: Record<string, number>,
  baseInventoryChance: number = 0.4, // 40% base chance - higher since it's more targeted
  itemsToGet: number = 1
): InventoryLootResult => {
  const difficulty = pyramidExpedition.journey.difficulty
  const tombIds = journeys
    .filter(
      (j) =>
        j.type === "treasure_tomb" &&
        // same or higher difficulty
        difficultyCompare(j.difficulty, difficulty) <= 0
    )
    .map((j) => j.id)
  console.log("tombIds", tombIds)
  const itemsRequired: Record<string, number> = {}

  tombIds.forEach((tombId) => {
    const tombInfo = journeys.find(
      (j): j is TreasureTombJourney =>
        j.id === tombId && j.type === "treasure_tomb"
    )
    // get current run for tomb
    const currentRun =
      journeyLog.filter((j) => j.journeyId === tombId && j.completed).length + 1
    const currentLevel =
      journeyLog.find((j) => j.journeyId === tombId && !j.completed)?.levelNr ??
      1

    const tableau = tableauLevels.find(
      (t) => t.tombJourneyId === tombId && t.runNumber === currentRun
    )
    if (!tableau || !tombInfo) return
    const seed = journeySeedGenerator(journeyLog)(tombId)
    const random = mulberry32(generateNewSeed(seed, currentLevel))
    const settings = {
      amountSymbols: tableau.symbolCount,
      hieroglyphIds: tableau.inventoryIds,
      numberRange: tombInfo.levelSettings.numberRange,
      operations: tombInfo.levelSettings.operators,
    }
    const calculation = generateRewardCalculation(settings, random)

    // add all symbols to itemsRequired
    Object.entries(calculation.symbolCounts).forEach(([symbol, count]) => {
      if (itemsRequired[symbol]) {
        itemsRequired[symbol] += count
      } else {
        itemsRequired[symbol] = count
      }
    })
  })
  console.log("itemsRequired", itemsRequired)
  // calculate awarded loot items based on required items and player inventory
  const awardedItems: Record<string, number> = {}
}
