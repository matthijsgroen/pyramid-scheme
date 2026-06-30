import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { hieroglyphRequired } from "@/data/generatedWorld"

type ProgressionState = {
  hieroglyphFragments: Record<string, number>
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  mosaicSeenCount: number
  mosaicPieceCount: number
  collectedMapPieces: Record<string, number>
  currentHealth: number // half-hearts
  maxHealth: number // half-hearts
}

// First tomb of each tier is visible from the start; secondary tombs appear on first map piece
const AUTO_DISCOVERED_TOMBS = [
  "starter_treasure_tomb",
  "junior_treasure_tomb",
  "expert_treasure_tomb",
  "master_treasure_tomb",
  "wizard_treasure_tomb",
]

const initialState: ProgressionState = {
  hieroglyphFragments: {},
  tombKeys: {},
  discoveredTombs: AUTO_DISCOVERED_TOMBS,
  mosaicSeenCount: 0,
  mosaicPieceCount: 0,
  collectedMapPieces: {},
  currentHealth: 6,
  maxHealth: 6,
}

export const trapDamage = (armorStacks: number): number => Math.max(1, 2 - armorStacks)

export type ProgressionAPI = {
  addFragment: (hieroglyphId: string) => void
  isHieroglyphComplete: (hieroglyphId: string) => boolean
  hieroglyphProgress: (hieroglyphId: string) => { found: number; required: number }
  hieroglyphFragments: Record<string, number>
  hasTombKey: (treasureId: string) => boolean
  addTombKey: (treasureId: string) => void
  tombKeyIds: ReadonlySet<string>
  isTombDiscovered: (tombJourneyId: string) => boolean
  discoverTomb: (tombJourneyId: string) => void
  mosaicSeenCount: number
  mosaicPieceCount: number
  collectMosaicPiece: () => void
  markMosaicViewed: (count: number) => void
  collectMapPiece: (tombId: string) => void
  mapPieceCount: (tombId: string) => number
  currentHealth: number
  maxHealth: number
  canAttemptTrap: () => boolean
  takeTrapDamage: (armorStacks: number) => void
  heal: (halfHearts: number) => void
  healToFull: () => void
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v2", initialState)

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
      isHieroglyphComplete: hieroglyphId =>
        (state.hieroglyphFragments[hieroglyphId] ?? 0) >= (hieroglyphRequired[hieroglyphId] ?? 2),
      hieroglyphProgress: hieroglyphId => ({
        found: state.hieroglyphFragments[hieroglyphId] ?? 0,
        required: hieroglyphRequired[hieroglyphId] ?? 2,
      }),
      hieroglyphFragments: state.hieroglyphFragments,
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
      mosaicSeenCount: state.mosaicSeenCount,
      mosaicPieceCount: state.mosaicPieceCount ?? 0,
      collectMosaicPiece: () => setState(prev => ({ ...prev, mosaicPieceCount: (prev.mosaicPieceCount ?? 0) + 1 })),
      markMosaicViewed: count =>
        setState(prev => ({ ...prev, mosaicSeenCount: Math.max(prev.mosaicSeenCount, count) })),
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
      currentHealth: state.currentHealth ?? 6,
      maxHealth: state.maxHealth ?? 6,
      canAttemptTrap: () => (state.currentHealth ?? 6) >= 2,
      takeTrapDamage: armorStacks =>
        setState(prev => ({
          ...prev,
          currentHealth: Math.max(0, (prev.currentHealth ?? 6) - trapDamage(armorStacks)),
        })),
      heal: halfHearts =>
        setState(prev => ({
          ...prev,
          currentHealth: Math.min(prev.maxHealth ?? 6, (prev.currentHealth ?? 6) + halfHearts),
        })),
      healToFull: () => setState(prev => ({ ...prev, currentHealth: prev.maxHealth ?? 6 })),
    }),
    [state, setState]
  )
}
