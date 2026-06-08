import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { Treasure, MaterialTier } from "@/data/treasures"
import { difficultyByMaterialTier, materialTierByDifficulty } from "@/data/treasures"
import { TOMB_SYMBOLS } from "@/data/tableaus"
import { generateNewSeed, mulberry32, shuffle } from "@/game/random"

export const determineExpeditionBonus = (activeJourney: CombinedJourneyState, ownedTreasures: Treasure[]): string[] => {
  const isLastLevel = activeJourney.levelNr >= activeJourney.journey.levelCount
  if (!isLastLevel) return []

  const expeditionTier = materialTierByDifficulty[activeJourney.journey.difficulty]

  const bonusByTier: Partial<Record<MaterialTier, number>> = {}
  for (const treasure of ownedTreasures) {
    const effect = treasure.effects?.expeditionBonus
    if (!effect || effect.tier !== expeditionTier) continue
    bonusByTier[effect.tier] = (bonusByTier[effect.tier] ?? 0) + effect.amount
  }

  if (Object.keys(bonusByTier).length === 0) return []

  const expSeed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr + 3000)
  const expRandom = mulberry32(expSeed)
  const itemIds: string[] = []

  for (const [tier, amount] of Object.entries(bonusByTier) as [MaterialTier, number][]) {
    const tierItems = TOMB_SYMBOLS[difficultyByMaterialTier[tier]]
    const shuffledItems = shuffle(tierItems, expRandom)
    for (let i = 0; i < amount; i++) {
      itemIds.push(shuffledItems[i % shuffledItems.length])
    }
  }

  return itemIds
}
