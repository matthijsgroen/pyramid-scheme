import { tableauLevels } from "./tableaus"

/**
 * Lookup function that returns all tableau levels where the given inventory item ID appears
 * @param itemId - The inventory item ID (e.g., "d1", "p5", "a3", "art10")
 * @returns Array of level numbers where the item appears, or empty array if not found
 */
export const getItemLevels = (itemId: string): number[] => {
  return tableauLevels
    .filter((level) => level.inventoryIds.includes(itemId))
    .map((level) => level.levelNr)
    .sort((a, b) => a - b) // Sort levels in ascending order
}

/**
 * Get the first (lowest) level where an item appears
 * @param itemId - The inventory item ID
 * @returns The lowest level number where the item appears, or null if not found
 */
export const getItemFirstLevel = (itemId: string): number | null => {
  const levels = getItemLevels(itemId)
  return levels.length > 0 ? levels[0] : null
}
