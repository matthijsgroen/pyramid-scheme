import type { Difficulty } from "@/data/difficultyLevels"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"

// Everything a tile needs to be drawn for a symbol. `fragmentProgress` is optional because only
// screens that know the player's collection (the tomb tableau) can say how far a hieroglyph is from
// complete; the data layer on its own cannot.
export type HieroglyphSymbolResolver = (symbolId: string) => {
  symbol?: string
  difficulty: Difficulty
  fragmentProgress?: { found: number; required: number }
}

export const resolveHieroglyphSymbol = (symbolId: string, fallbackDifficulty: Difficulty) => ({
  symbol: getInventoryItemById(symbolId)?.symbol,
  difficulty: getItemFirstLevel(symbolId) ?? fallbackDifficulty,
})
