// Ordered reveal sequence for the stained-glass mosaic.
//
// The window is five horizontal registers, one per difficulty tier, and it fills the way an
// Egyptian tomb wall is read: register by register from the top, left to right inside each one.
// So the reveal order is simply the canonical journey order — scripts/traceMask.ts already handed
// every traced polygon to a (journey, level) step by that rule.
//
// A register therefore completes when its tier is played out, which is what lets a finished panel
// trigger its own beat. See docs/game-design/story-and-time-brainstorm.md §3.

import { journeys } from "@/data/journeys"
import { MOSAIC_PIECES } from "@/ui/atoms/mosaicPieces.generated"

// Pre-index pieces by step key
export const PIECES_BY_STEP = new Map<string, string[]>()
for (const p of MOSAIC_PIECES) {
  const key = `${p.journeyId}:${p.levelIndex}`
  const arr = PIECES_BY_STEP.get(key) ?? []
  arr.push(p.id)
  PIECES_BY_STEP.set(key, arr)
}

// Journey order is the canonical game sequence, filtered to journeys that actually carry pieces
const pieceJourneyIds = new Set(MOSAIC_PIECES.map(p => p.journeyId))

export const LEVEL_STEPS: Array<{ journeyId: string; levelIndex: number }> = journeys
  .map(j => j.id)
  .filter(id => pieceJourneyIds.has(id))
  .flatMap(journeyId => {
    const max = MOSAIC_PIECES.filter(p => p.journeyId === journeyId).reduce((m, p) => Math.max(m, p.levelIndex), -1)
    return Array.from({ length: max + 1 }, (_, levelIndex) => ({ journeyId, levelIndex }))
  })
