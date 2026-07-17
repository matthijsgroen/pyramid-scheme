import { TOMB_SYMBOLS } from "@/data/tableaus"
import { difficulties, type Difficulty } from "./difficultyLevels"

/**
 * Get the first (lowest) level where a tableau symbol appears.
 * @param itemId - The inventory item ID (a tableau/hieroglyph symbol)
 * @returns The lowest difficulty where the symbol appears, or undefined if not found. Tomb-treasure
 * ids aren't resolved here — that content is mod-owned; a treasure carries its own difficulty on the
 * Collection item it emits.
 */
export const getItemFirstLevel = (itemId: string): Difficulty =>
  difficulties.find(key => TOMB_SYMBOLS[key].some(item => item === itemId))!
