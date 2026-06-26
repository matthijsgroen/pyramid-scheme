import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"

type ProgressionState = {
  hieroglyphFragments: Record<string, number>
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  mosaicPieces: string[]
}

const initialState: ProgressionState = {
  hieroglyphFragments: {},
  tombKeys: {},
  discoveredTombs: [],
  mosaicPieces: [],
}

export type ProgressionAPI = {
  addFragment: (hieroglyphId: string) => void
  isHieroglyphComplete: (hieroglyphId: string) => boolean
  hieroglyphProgress: (hieroglyphId: string) => { found: number; required: number }
  hasTombKey: (treasureId: string) => boolean
  addTombKey: (treasureId: string) => void
  tombKeyIds: ReadonlySet<string>
  isTombDiscovered: (tombJourneyId: string) => boolean
  discoverTomb: (tombJourneyId: string) => void
  collectMosaicPiece: (pyramidJourneyId: string) => void
  hasMosaicPiece: (pyramidJourneyId: string) => boolean
}

// ponytail: fixed threshold; refine per-tier in Phase 6 when fragment authored data ships
const FRAGMENT_THRESHOLD = 3

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression", initialState)

  return useMemo(
    () => ({
      addFragment: hieroglyphId =>
        setState(prev => ({
          ...prev,
          hieroglyphFragments: {
            ...prev.hieroglyphFragments,
            [hieroglyphId]: (prev.hieroglyphFragments[hieroglyphId] ?? 0) + 1,
          },
        })),
      isHieroglyphComplete: hieroglyphId => (state.hieroglyphFragments[hieroglyphId] ?? 0) >= FRAGMENT_THRESHOLD,
      hieroglyphProgress: hieroglyphId => ({
        found: state.hieroglyphFragments[hieroglyphId] ?? 0,
        required: FRAGMENT_THRESHOLD,
      }),
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
      collectMosaicPiece: pyramidJourneyId =>
        setState(prev => ({
          ...prev,
          mosaicPieces: prev.mosaicPieces.includes(pyramidJourneyId)
            ? prev.mosaicPieces
            : [...prev.mosaicPieces, pyramidJourneyId],
        })),
      hasMosaicPiece: pyramidJourneyId => state.mosaicPieces.includes(pyramidJourneyId),
    }),
    [state, setState]
  )
}
