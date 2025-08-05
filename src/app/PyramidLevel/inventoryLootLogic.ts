import type { JourneyState } from "@/app/state/useJourneys"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  getAllSymbolsForTomb,
  lootDistribution,
} from "@/data/loot-distribution"
import { generateNewSeed, mulberry32 } from "@/game/random"

export type InventoryLootResult = {
  shouldAwardInventoryItem: boolean
  itemId: string | null
  baseChance: number
  adjustedChance: number
  needMultiplier: number
}

export type InventoryNeedAnalysis = {
  itemId: string
  difficultyLevel: Difficulty
  neededInTombs: string[]
  totalTimesNeeded: number
  urgencyScore: number
}

/**
 * Get the tomb ID that corresponds to a difficulty level
 */
function getTombIdForDifficulty(difficulty: Difficulty): string {
  const difficultyToTomb: Record<Difficulty, string> = {
    starter: "starter_treasure_tomb",
    junior: "junior_treasure_tomb",
    expert: "expert_treasure_tomb",
    master: "master_treasure_tomb",
    wizard: "wizard_treasure_tomb",
  }
  return difficultyToTomb[difficulty]
}

/**
 * Get all difficulty levels in order from starter to wizard
 */
function getDifficultyProgression(): Difficulty[] {
  return ["starter", "junior", "expert", "master", "wizard"]
}

/**
 * Analyzes which inventory items the player needs based on:
 * - Current pyramid expedition difficulty level
 * - Items from current difficulty that are also used in higher difficulty tombs
 * - Player's current inventory levels
 */
export function analyzeInventoryNeeds(
  pyramidExpedition: JourneyState,
  playerInventory: Record<string, number>
): InventoryNeedAnalysis[] {
  const expeditionDifficulty = pyramidExpedition.journey.difficulty
  const difficultyProgression = getDifficultyProgression()
  const currentDifficultyIndex =
    difficultyProgression.indexOf(expeditionDifficulty)

  // Collect all relevant tombs: current difficulty + available higher difficulties
  const relevantTombs: Array<{ difficulty: Difficulty; tombId: string }> = []

  // Always include current difficulty tomb
  relevantTombs.push({
    difficulty: expeditionDifficulty,
    tombId: getTombIdForDifficulty(expeditionDifficulty),
  })

  // Include ALL higher difficulty tombs since the player can access these difficulty levels
  // But only collect items from the current difficulty level that are used in those higher tombs
  for (
    let i = currentDifficultyIndex + 1;
    i < difficultyProgression.length;
    i++
  ) {
    const higherDifficulty = difficultyProgression[i]
    relevantTombs.push({
      difficulty: higherDifficulty,
      tombId: getTombIdForDifficulty(higherDifficulty),
    })
  }

  // Collect all unique symbols needed across relevant tombs
  const allRelevantSymbols = new Set<string>()
  const tombSymbolCounts = new Map<
    string,
    { totalNeeded: number; neededInTombs: string[] }
  >()

  // Get symbols available at current difficulty level
  const currentDifficultySymbols = new Set(
    getAllSymbolsForTomb(getTombIdForDifficulty(expeditionDifficulty))
  )

  relevantTombs.forEach(({ tombId }) => {
    const tombSymbols = getAllSymbolsForTomb(tombId)
    const tombData = lootDistribution.find((t) => t.tombId === tombId)

    if (tombData) {
      tombSymbols.forEach((symbol) => {
        // Only include symbols that are available at the current expedition difficulty level
        // This means junior expeditions can find junior symbols used in expert/master tombs,
        // but cannot find expert/master-exclusive symbols
        if (currentDifficultySymbols.has(symbol)) {
          allRelevantSymbols.add(symbol)

          // Count how many times this symbol is needed in this tomb
          let timesNeededInTomb = 0
          tombData.runs.forEach((run) => {
            if (run.requiredSymbols.includes(symbol)) {
              timesNeededInTomb += 1
            }
          })

          const existing = tombSymbolCounts.get(symbol) || {
            totalNeeded: 0,
            neededInTombs: [],
          }
          existing.totalNeeded += timesNeededInTomb
          if (
            timesNeededInTomb > 0 &&
            !existing.neededInTombs.includes(tombId)
          ) {
            existing.neededInTombs.push(tombId)
          }
          tombSymbolCounts.set(symbol, existing)
        }
      })
    }
  })

  // Create analysis for all relevant symbols
  return Array.from(allRelevantSymbols)
    .map((itemId) => {
      const symbolData = tombSymbolCounts.get(itemId) || {
        totalNeeded: 0,
        neededInTombs: [],
      }

      // Calculate urgency score based on:
      // - How many times the symbol is needed across all relevant tombs
      // - Current inventory levels
      // - Whether it's needed in current difficulty vs higher difficulties
      const currentInventory = playerInventory[itemId] || 0
      let urgencyScore = symbolData.totalNeeded

      // Higher urgency if player has none of this item
      if (currentInventory === 0) {
        urgencyScore += 5
      }
      // Lower urgency if player already has plenty
      else if (currentInventory >= symbolData.totalNeeded) {
        urgencyScore = Math.max(0, urgencyScore - 3)
      }

      // Bonus urgency if needed in current difficulty tomb
      const currentTombId = getTombIdForDifficulty(expeditionDifficulty)
      if (symbolData.neededInTombs.includes(currentTombId)) {
        urgencyScore += 3
      }

      return {
        itemId,
        difficultyLevel: expeditionDifficulty,
        neededInTombs: symbolData.neededInTombs,
        totalTimesNeeded: symbolData.totalNeeded,
        urgencyScore,
      }
    })
    .filter((item) => item.totalTimesNeeded > 0) // Only include items that are actually needed
    .sort((a, b) => b.urgencyScore - a.urgencyScore) // Sort by urgency
}

/**
 * Determines if player should receive an inventory item from a pyramid expedition
 * based on items from their current difficulty level that are used in higher difficulty tombs
 */
export function determineInventoryLoot(
  pyramidExpedition: JourneyState,
  playerInventory: Record<string, number>,
  baseInventoryChance: number = 0.3 // 30% base chance
): InventoryLootResult {
  const needsAnalysis = analyzeInventoryNeeds(
    pyramidExpedition,
    playerInventory
  )

  if (needsAnalysis.length === 0) {
    return {
      shouldAwardInventoryItem: false,
      itemId: null,
      baseChance: baseInventoryChance,
      adjustedChance: 0,
      needMultiplier: 0,
    }
  }

  // Generate deterministic random number based on journey state
  const lootSeed = generateNewSeed(
    pyramidExpedition.randomSeed,
    pyramidExpedition.levelNr + 1000 // Offset to avoid collision with map piece seed
  )
  const random = mulberry32(lootSeed)

  // Find the most urgent item that player doesn't have enough of
  let selectedItem: InventoryNeedAnalysis | null = null
  let highestNeedMultiplier = 0

  for (const item of needsAnalysis) {
    const currentInventory = playerInventory[item.itemId] || 0
    const needsMore =
      currentInventory < Math.max(1, Math.floor(item.totalTimesNeeded / 2))

    if (needsMore) {
      // Calculate need multiplier based on urgency and scarcity
      let needMultiplier = 1

      // Base multiplier on urgency score
      needMultiplier += item.urgencyScore * 0.2

      // Extra boost if player has none of this item
      if (currentInventory === 0) needMultiplier += 2

      // Scale by total times needed (but cap the effect)
      needMultiplier += Math.min(item.totalTimesNeeded * 0.1, 1)

      if (needMultiplier > highestNeedMultiplier) {
        highestNeedMultiplier = needMultiplier
        selectedItem = item
      }
    }
  }

  // If no urgent needs, consider any item player doesn't have
  if (!selectedItem && needsAnalysis.length > 0) {
    for (const item of needsAnalysis.slice(0, 5)) {
      // Check top 5 most urgent
      const currentInventory = playerInventory[item.itemId] || 0
      if (currentInventory === 0) {
        selectedItem = item
        highestNeedMultiplier = 1.5 // Modest boost for new items
        break
      }
    }
  }

  if (!selectedItem) {
    return {
      shouldAwardInventoryItem: false,
      itemId: null,
      baseChance: baseInventoryChance,
      adjustedChance: 0,
      needMultiplier: 0,
    }
  }

  // Calculate final chance
  const adjustedChance = Math.min(
    baseInventoryChance * highestNeedMultiplier,
    0.8
  ) // Cap at 80%
  const shouldAward = random() < adjustedChance

  return {
    shouldAwardInventoryItem: shouldAward,
    itemId: selectedItem.itemId,
    baseChance: baseInventoryChance,
    adjustedChance,
    needMultiplier: highestNeedMultiplier,
  }
}
