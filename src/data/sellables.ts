// Junk loot found loose in pyramid corridors — sold for money at any Fez shop.
// Distinct from the 40 tomb treasures (treasures.ts) — do not repurpose either set.
// Names/descriptions live in locale files (public/locales/*/sellables.json), not here —
// same pattern as treasures.ts/treasures.json.

import { materialTierByDifficulty, type MaterialTier } from "./materialTiers"
import type { Difficulty } from "./difficultyLevels"

export type SellableItem = { id: string; symbol: string; tier: MaterialTier }

export const SELL_VALUE_BY_TIER: Record<MaterialTier, number> = {
  stone: 10,
  bronze: 20,
  silver: 30,
  gold: 40,
  divine: 50,
}

export const SELLABLES_BY_TIER: Record<MaterialTier, SellableItem[]> = {
  stone: [
    { id: "sell_stone_1", symbol: "𓊪", tier: "stone" },
    { id: "sell_stone_2", symbol: "𓎼", tier: "stone" },
    { id: "sell_stone_3", symbol: "𓅱", tier: "stone" },
    { id: "sell_stone_4", symbol: "𓋴", tier: "stone" },
    { id: "sell_stone_5", symbol: "𓄿", tier: "stone" },
  ],
  bronze: [
    { id: "sell_bronze_1", symbol: "𓆙", tier: "bronze" },
    { id: "sell_bronze_2", symbol: "𓁶", tier: "bronze" },
    { id: "sell_bronze_3", symbol: "𓊹", tier: "bronze" },
    { id: "sell_bronze_4", symbol: "𓆼", tier: "bronze" },
    { id: "sell_bronze_5", symbol: "𓎛", tier: "bronze" },
  ],
  silver: [
    { id: "sell_silver_1", symbol: "𓋹", tier: "silver" },
    { id: "sell_silver_2", symbol: "𓁹", tier: "silver" },
    { id: "sell_silver_3", symbol: "𓊵", tier: "silver" },
    { id: "sell_silver_4", symbol: "𓎟", tier: "silver" },
    { id: "sell_silver_5", symbol: "𓋲", tier: "silver" },
  ],
  gold: [
    { id: "sell_gold_1", symbol: "𓎼", tier: "gold" },
    { id: "sell_gold_2", symbol: "𓊛", tier: "gold" },
    { id: "sell_gold_3", symbol: "𓆈", tier: "gold" },
    { id: "sell_gold_4", symbol: "𓋺", tier: "gold" },
    { id: "sell_gold_5", symbol: "𓁷", tier: "gold" },
  ],
  divine: [
    { id: "sell_divine_1", symbol: "𓆣", tier: "divine" },
    { id: "sell_divine_2", symbol: "𓁿", tier: "divine" },
    { id: "sell_divine_3", symbol: "𓋴", tier: "divine" },
    { id: "sell_divine_4", symbol: "𓊪", tier: "divine" },
    { id: "sell_divine_5", symbol: "𓅓", tier: "divine" },
  ],
}

export const ALL_SELLABLES: SellableItem[] = Object.values(SELLABLES_BY_TIER).flat()

export const sellablesForDifficulty = (difficulty: Difficulty): SellableItem[] =>
  SELLABLES_BY_TIER[materialTierByDifficulty[difficulty]]

export const getSellableById = (id: string): SellableItem | undefined => ALL_SELLABLES.find(item => item.id === id)

export const sellValueForItemId = (id: string): number => {
  const item = getSellableById(id)
  return item ? SELL_VALUE_BY_TIER[item.tier] : 0
}
