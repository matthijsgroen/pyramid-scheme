import {
  journeySeedGenerator,
  type JourneyState,
} from "@/app/state/useJourneys"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { tableauLevels } from "@/data/tableaus"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { getItemFirstLevel } from "@/data/itemLevelLookup"

const difficultyCompare = (a: Difficulty, b: Difficulty): number =>
  difficulties.indexOf(a) - difficulties.indexOf(b)

export type InventoryLootResult = {
  shouldAwardInventoryItem: boolean
  itemIds: string[]
  baseChance: number
  adjustedChance: number
  needMultiplier: number
}

/**
 * Determines if player should receive an inventory item based on current available tomb runs.
 * This focuses on items needed for the next available runs of each treasure tomb.
 */
export const determineInventoryLootForCurrentRuns = (
  pyramidExpedition: JourneyState,
  journeyLog: Array<{ journeyId: string; completed: boolean; levelNr: number }>,
  playerInventory: Record<string, number>,
  baseInventoryChance: number = 0.4, // 40% base chance - higher since it's more targeted
  maxItemsToAward: number = 1
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
  const itemsRequired: Record<string, number> = {}
  const itemsInteresting: string[] = []

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
      (t) =>
        t.tombJourneyId === tombId &&
        t.runNumber === currentRun &&
        t.levelNr === currentLevel
    )

    // collect all interesting items in this run for this tomb
    tableauLevels.forEach((tableau) => {
      if (
        tableau.tombJourneyId === tombId &&
        tableau.runNumber === currentRun
      ) {
        tableau.inventoryIds.forEach((itemId) => {
          if (!itemsInteresting.includes(itemId)) {
            itemsInteresting.push(itemId)
          }
        })
      }
    })

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

  // Filter out items above current difficulty level
  const filteredItemsRequired: Record<string, number> = {}
  Object.entries(itemsRequired).forEach(([itemId, count]) => {
    const itemDifficulty = getItemFirstLevel(itemId)
    if (difficultyCompare(itemDifficulty, difficulty) <= 0) {
      filteredItemsRequired[itemId] = count
    }
  })

  // Calculate urgency scores for each needed item
  const urgencyScores = Object.entries(filteredItemsRequired).map(
    ([itemId, needed]) => {
      const currentInventory = playerInventory[itemId] || 0
      let urgencyScore = needed // Base score from how much is needed

      // Higher urgency if player has none of this item
      if (currentInventory === 0) {
        urgencyScore += 5
      }
      // Lower urgency if player already has plenty
      else if (currentInventory >= needed) {
        urgencyScore = 0
      }

      return {
        itemId,
        needed,
        urgencyScore,
        deficit: Math.max(0, needed - currentInventory),
      }
    }
  )

  // Sort by urgency score and select the most needed items
  urgencyScores.sort((a, b) => b.urgencyScore - a.urgencyScore)

  // Select up to maxItemsToAward items with positive urgency scores
  let selectedItems = urgencyScores
    .filter((item) => item.urgencyScore > 0)
    .slice(0, maxItemsToAward)

  // If no urgent items, fall back to interesting items (filtered by difficulty)
  if (selectedItems.length === 0) {
    const filteredInterestingItems = itemsInteresting.filter((itemId) => {
      const itemDifficulty = getItemFirstLevel(itemId)
      return difficultyCompare(itemDifficulty, difficulty) <= 0
    })

    if (filteredInterestingItems.length === 0) {
      return {
        shouldAwardInventoryItem: false,
        itemIds: [],
        baseChance: baseInventoryChance,
        adjustedChance: 0,
        needMultiplier: 0,
      }
    }

    // Pick random items from the interesting list
    const shuffledInteresting = [...filteredInterestingItems].sort(
      () => Math.random() - 0.5
    )
    const fallbackItems = shuffledInteresting.slice(0, maxItemsToAward)

    selectedItems = fallbackItems.map((itemId) => ({
      itemId,
      needed: 1, // Default to 1 for interesting items
      urgencyScore: 1, // Low urgency for fallback items
      deficit: 1,
    }))
  }

  // Calculate overall urgency from all selected items
  const totalUrgency = selectedItems.reduce(
    (sum, item) => sum + item.urgencyScore,
    0
  )
  const avgUrgency = totalUrgency / selectedItems.length

  // Calculate adjusted chance based on average urgency
  const needMultiplier = Math.max(Math.min(3, avgUrgency / 5), 1) // Cap at 3x multiplier
  const adjustedChance = Math.min(
    Math.max(0.8, baseInventoryChance),
    baseInventoryChance * needMultiplier
  ) // Cap at 80% by default, but can be higher for high base chance

  // Generate deterministic random number based on journey state
  const lootSeed = generateNewSeed(
    pyramidExpedition.randomSeed,
    pyramidExpedition.levelNr + 1000 // Offset to avoid collision with map piece seed
  )

  const random = mulberry32(lootSeed)
  const shouldAward = random() < adjustedChance

  return {
    shouldAwardInventoryItem: shouldAward,
    itemIds: shouldAward ? selectedItems.map((item) => item.itemId) : [],
    baseChance: baseInventoryChance,
    adjustedChance,
    needMultiplier,
  }
}
