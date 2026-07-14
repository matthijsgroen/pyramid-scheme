import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { createLedger, type Ledger, type LedgerState } from "@/game/ledger/ledger"

export type PerkState = {
  armorStacks: number // 0–2
  trapInsightStacks: number // 0–2
  packMuleLevel: number // 0–1
  compassLevel: number // 0–3
  consumableDetectorLevel: number // 0–3
  detectionLevel: number // 0–4
  scribesEyeLevel: number // 0–3
}

// Perks split by consuming mod (see src/game/perks) — trap keeps its own stacks plus the
// health cap, puzzle keeps scribesEye, core keeps the three detector perks. ProgressionAPI
// still exposes one merged `perks`/`maxHealth` shape; only the internal storage is split.
type TrapPerks = { armorStacks: number; trapInsightStacks: number; packMuleLevel: number; maxHealth: number }
type PuzzlePerks = { scribesEyeLevel: number }
type CorePerks = { compassLevel: number; consumableDetectorLevel: number; detectionLevel: number }

const INITIAL_TRAP_PERKS: TrapPerks = { armorStacks: 0, trapInsightStacks: 0, packMuleLevel: 0, maxHealth: 6 }
const INITIAL_PUZZLE_PERKS: PuzzlePerks = { scribesEyeLevel: 0 }
const INITIAL_CORE_PERKS: CorePerks = { compassLevel: 0, consumableDetectorLevel: 0, detectionLevel: 0 }

// The ledger starts empty and creates currency keys lazily on first grant — core seeds no
// currency id, so a mod owns which ids exist (shop's money, mosaic's mosaicPiece, …) while core
// owns the bucket. Health is NOT a ledger currency: it's trap-only, in the trap mod's own state.
const DEFAULT_LEDGER: LedgerState = {}

type ProgressionState = {
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  collectedMapPieces: Record<string, number>
  // journeyIds whose map-piece chest has been opened — inventory-as-truth for the journey list badge
  mapPieceJourneys: string[]
  trapPerks: TrapPerks
  puzzlePerks: PuzzlePerks
  corePerks: CorePerks
  ledger: LedgerState
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
  tombKeys: {},
  discoveredTombs: AUTO_DISCOVERED_TOMBS,
  collectedMapPieces: {},
  mapPieceJourneys: [],
  trapPerks: INITIAL_TRAP_PERKS,
  puzzlePerks: INITIAL_PUZZLE_PERKS,
  corePerks: INITIAL_CORE_PERKS,
  ledger: DEFAULT_LEDGER,
}

export type ProgressionAPI = {
  hasTombKey: (treasureId: string) => boolean
  addTombKey: (treasureId: string) => void
  applyTreasurePerk: (treasureId: string) => void
  tombKeyIds: ReadonlySet<string>
  isTombDiscovered: (tombJourneyId: string) => boolean
  discoverTomb: (tombJourneyId: string) => void
  collectMapPiece: (tombId: string) => void
  mapPieceCount: (tombId: string) => number
  hasMapPiece: (journeyId: string) => boolean
  markMapPieceFound: (journeyId: string) => void
  perks: PerkState
  // Generic id-keyed currency store — a mod grants/spends its own currency ids; core seeds none.
  ledger: Ledger
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v4", initialState)

  return useMemo(() => {
    const ledger = createLedger(state.ledger ?? DEFAULT_LEDGER, updater =>
      setState(prev => ({ ...prev, ledger: updater(prev.ledger ?? DEFAULT_LEDGER) }))
    )
    const trapPerks = state.trapPerks ?? INITIAL_TRAP_PERKS
    const puzzlePerks = state.puzzlePerks ?? INITIAL_PUZZLE_PERKS
    const corePerks = state.corePerks ?? INITIAL_CORE_PERKS

    return {
      hasTombKey: treasureId => !!state.tombKeys[treasureId],
      addTombKey: treasureId => setState(prev => ({ ...prev, tombKeys: { ...prev.tombKeys, [treasureId]: true } })),
      // The perk system is disregarded pending its redesign (user decision): treasure-granted
      // stat perks (armor/max-health/pack-mule/trap-insight, compass/detector/detection,
      // scribes-eye) do nothing, so every perk stays at its baseline (maxHealth 6, armor 0, …).
      // The perk registry (src/game/perks) + registerPerks stay as dormant anchors for the
      // redesign; only this grant is stubbed. Restore the registry-driven bump here to revive.
      applyTreasurePerk: () => {},
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
      hasMapPiece: journeyId => (state.mapPieceJourneys ?? []).includes(journeyId),
      markMapPieceFound: journeyId =>
        setState(prev =>
          (prev.mapPieceJourneys ?? []).includes(journeyId)
            ? prev
            : { ...prev, mapPieceJourneys: [...(prev.mapPieceJourneys ?? []), journeyId] }
        ),
      perks: {
        armorStacks: trapPerks.armorStacks,
        trapInsightStacks: trapPerks.trapInsightStacks,
        packMuleLevel: trapPerks.packMuleLevel,
        compassLevel: corePerks.compassLevel,
        consumableDetectorLevel: corePerks.consumableDetectorLevel,
        detectionLevel: corePerks.detectionLevel,
        scribesEyeLevel: puzzlePerks.scribesEyeLevel,
      },
      ledger,
    }
  }, [state, setState])
}
