import { produce } from "immer"

export type TableauPuzzleState = {
  filledPositions: Record<string, number>
  symbolCounts: Record<string, number>
  inventoryUsage: Record<string, number>
}

export const createTableauPuzzleState = (): TableauPuzzleState => ({
  filledPositions: {},
  symbolCounts: {},
  inventoryUsage: {},
})

/**
 * Toggles a tile at `position`: removes it if filled, otherwise places `symbolId`
 * there when inventory allows it. `targetCounts` and `availableInInventory` are the
 * puzzle's requirement and the player's remaining stock for that symbol.
 */
export const toggleTableauTile = produce(
  (
    state: TableauPuzzleState,
    symbolId: string,
    position: string,
    targetCounts: Record<string, number>,
    availableInInventory: number
  ) => {
    if (state.filledPositions[position] > 0) {
      delete state.filledPositions[position]
      state.symbolCounts[symbolId] = Math.max(0, (state.symbolCounts[symbolId] || 0) - 1)
      state.inventoryUsage[symbolId] = Math.max(0, (state.inventoryUsage[symbolId] || 0) - 1)
      return
    }

    const currentUsage = state.inventoryUsage[symbolId] || 0
    const currentPlaced = state.symbolCounts[symbolId] || 0
    const maxNeeded = targetCounts[symbolId] || 0
    if (availableInInventory > currentUsage && currentPlaced < maxNeeded) {
      state.filledPositions[position] = 1
      state.symbolCounts[symbolId] = currentPlaced + 1
      state.inventoryUsage[symbolId] = currentUsage + 1
    }
  }
)

export const isTableauPuzzleCompleted = (state: TableauPuzzleState, targetCounts: Record<string, number>): boolean =>
  Object.entries(targetCounts).every(([symbolId, maxNeeded]) => state.symbolCounts[symbolId] === maxNeeded)
