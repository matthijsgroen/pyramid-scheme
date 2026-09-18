import type { Difficulty } from "@/data/difficultyLevels"
import { getInventoryItemById } from "./symbolCatalogue"
import { getItemFirstLevel } from "./itemLevelLookup"

// A symbol id as the formula tiles need it: the glyph to draw, and the difficulty that colours it.
export const resolveHieroglyphSymbol = (symbolId: string, fallbackDifficulty: Difficulty) => ({
  symbol: getInventoryItemById(symbolId)?.symbol,
  difficulty: getItemFirstLevel(symbolId) ?? fallbackDifficulty,
})
