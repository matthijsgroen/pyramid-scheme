import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import { piecesRequiredFor } from "../game/piecesRequired"

// Tomb-treasure-owned progression state — the map-piece / tomb-key loop, moved out of core
// useProgression so toggling the mod off drops all of it and core names none of it. Persisted in
// the mod's own slice (useModState key `pyramid-scheme-mod-tomb-treasure`).
//   - tombKeys: ward + location keys the player has earned from tomb treasures (opens pyramid
//     ward floors + drives tier unlock; read for gate satisfaction via the held-keys seam).
//   - discoveredTombs: tombs visible on the Travel screen — the first of each tier from the start,
//     secondary tombs revealed on their first map piece.
//   - collectedMapPieces: per-tomb count of map pieces found (unlocks a tomb's entry).
//   - mapPieceJourneys: pyramid journeys whose map-piece chest has been opened (inventory-as-truth
//     for the journey-list badge).

type TombTreasureState = {
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  collectedMapPieces: Record<string, number>
  mapPieceJourneys: string[]
}

// First tomb of each tier is visible from the start; secondary tombs appear on first map piece.
const AUTO_DISCOVERED_TOMBS = [
  "starter_treasure_tomb",
  "junior_treasure_tomb",
  "expert_treasure_tomb",
  "master_treasure_tomb",
  "wizard_treasure_tomb",
]

const INITIAL: TombTreasureState = {
  tombKeys: {},
  discoveredTombs: AUTO_DISCOVERED_TOMBS,
  collectedMapPieces: {},
  mapPieceJourneys: [],
}

export type TombTreasureProgressAPI = {
  hasTombKey: (treasureId: string) => boolean
  addTombKey: (treasureId: string) => void
  tombKeyIds: ReadonlySet<string>
  isTombDiscovered: (tombJourneyId: string) => boolean
  discoverTomb: (tombJourneyId: string) => void
  collectMapPiece: (tombId: string) => void
  mapPieceCount: (tombId: string) => number
  // Pieces found vs. the tomb's own entry threshold — the map-piece reward popup's progress line.
  mapPieceProgress: (tombId: string) => { found: number; required: number }
  hasMapPiece: (journeyId: string) => boolean
  markMapPieceFound: (journeyId: string) => void
}

export const useTombTreasureProgress = (): TombTreasureProgressAPI => {
  const [state, setState] = useModState<TombTreasureState>("tomb-treasure", INITIAL)

  return useMemo(
    () => ({
      hasTombKey: treasureId => !!state.tombKeys[treasureId],
      addTombKey: treasureId => setState(prev => ({ ...prev, tombKeys: { ...prev.tombKeys, [treasureId]: true } })),
      tombKeyIds: new Set(Object.keys(state.tombKeys)),
      isTombDiscovered: tombJourneyId => state.discoveredTombs.includes(tombJourneyId),
      discoverTomb: tombJourneyId =>
        setState(prev => ({
          ...prev,
          discoveredTombs: prev.discoveredTombs.includes(tombJourneyId)
            ? prev.discoveredTombs
            : [...prev.discoveredTombs, tombJourneyId],
        })),
      collectMapPiece: tombId =>
        setState(prev => {
          const prevCount = prev.collectedMapPieces[tombId] ?? 0
          return {
            ...prev,
            collectedMapPieces: { ...prev.collectedMapPieces, [tombId]: prevCount + 1 },
            // First map piece for a tomb reveals it on the travel screen
            discoveredTombs:
              prevCount === 0 && !prev.discoveredTombs.includes(tombId)
                ? [...prev.discoveredTombs, tombId]
                : prev.discoveredTombs,
          }
        }),
      mapPieceCount: tombId => state.collectedMapPieces[tombId] ?? 0,
      mapPieceProgress: tombId => ({
        found: state.collectedMapPieces[tombId] ?? 0,
        required: piecesRequiredFor(tombId),
      }),
      hasMapPiece: journeyId => (state.mapPieceJourneys ?? []).includes(journeyId),
      markMapPieceFound: journeyId =>
        setState(prev =>
          (prev.mapPieceJourneys ?? []).includes(journeyId)
            ? prev
            : { ...prev, mapPieceJourneys: [...(prev.mapPieceJourneys ?? []), journeyId] }
        ),
    }),
    [state, setState]
  )
}
