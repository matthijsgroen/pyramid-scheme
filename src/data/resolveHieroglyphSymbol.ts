import type { Difficulty } from "@/data/difficultyLevels"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"

export type HieroglyphSymbolResolver = (symbolId: string) => { symbol?: string; difficulty: Difficulty }

export const resolveHieroglyphSymbol = (symbolId: string, fallbackDifficulty: Difficulty) => ({
  symbol: getInventoryItemById(symbolId)?.symbol,
  difficulty: getItemFirstLevel(symbolId) ?? fallbackDifficulty,
})
