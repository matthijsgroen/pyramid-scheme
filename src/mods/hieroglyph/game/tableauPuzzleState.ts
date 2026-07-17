import { produce } from "immer"

export type TableauPuzzleState = {
  filledPositions: Record<string, number>
  symbolCounts: Record<string, number>
}

export const createTableauPuzzleState = (): TableauPuzzleState => ({
  filledPositions: {},
  symbolCounts: {},
})

/**
 * Toggles a tile at `position`: removes it if filled, otherwise places `symbolId` there when the
 * player owns that hieroglyph and the puzzle still has an open slot for it.
 *
 * A completed hieroglyph is a REUSABLE key (see keyRequirements.ts): owning it lets the symbol fill
 * every one of its slots — in this tableau and any other — and nothing is consumed. So placement
 * gates on `owned` (do you have the hieroglyph at all), not on a dwindling stock. `targetCounts` is
 * how many slots this symbol fills in this tableau (the puzzle target); completion is still "every
 * slot filled".
 */
export const toggleTableauTile = produce(
  (
    state: TableauPuzzleState,
    symbolId: string,
    position: string,
    targetCounts: Record<string, number>,
    owned: boolean
  ) => {
    if (state.filledPositions[position] > 0) {
      delete state.filledPositions[position]
      state.symbolCounts[symbolId] = Math.max(0, (state.symbolCounts[symbolId] || 0) - 1)
      return
    }

    const currentPlaced = state.symbolCounts[symbolId] || 0
    const maxNeeded = targetCounts[symbolId] || 0
    if (owned && currentPlaced < maxNeeded) {
      state.filledPositions[position] = 1
      state.symbolCounts[symbolId] = currentPlaced + 1
    }
  }
)

export const isTableauPuzzleCompleted = (state: TableauPuzzleState, targetCounts: Record<string, number>): boolean =>
  Object.entries(targetCounts).every(([symbolId, maxNeeded]) => state.symbolCounts[symbolId] === maxNeeded)
