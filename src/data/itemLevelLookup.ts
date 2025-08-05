import { TOMB_SYMBOLS } from "@/data/tableaus"
import { difficulties, type Difficulty } from "./difficultyLevels"

/**
 * Get the first (lowest) level where an item appears
 * @param itemId - The inventory item ID
 * @returns The lowest level number where the item appears, or null if not found
 */
export const getItemFirstLevel = (itemId: string): Difficulty =>
  difficulties.find((key) => TOMB_SYMBOLS[key].some((item) => item === itemId))!
