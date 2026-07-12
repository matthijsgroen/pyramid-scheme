import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { hieroglyphRequired } from "@/data/generatedWorld"
import type { ConsumableType } from "@/game/siteTypes"
import { TREASURE_PERKS } from "@/data/treasurePerks"
import { createLedger, type LedgerState } from "@/game/ledger/ledger"
import { getPerkMeta, type PerkSlice } from "@/game/perks/perkRegistry"
import { trapDamage, canAttemptTrap } from "@/game/traps/trapHealth"
import "./registerPerks"

type ConsumableInventory = { bandage: number; oil: number; trapTool: number }

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

// money/health/mosaicPiece — the ledger-backed currencies (see src/game/ledger).
const DEFAULT_LEDGER: LedgerState = { money: 0, health: 6, mosaicPiece: 0 }

type ProgressionState = {
  // "hieroglyphId:pieceIndex" entries — inventory-as-truth for chest loot
  collectedFragments: string[]
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  collectedMapPieces: Record<string, number>
  // journeyIds whose map-piece chest has been opened — inventory-as-truth for the journey list badge
  mapPieceJourneys: string[]
  consumables: ConsumableInventory
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

const consumableCarryCap = (packMuleLevel: number) => (packMuleLevel >= 1 ? 4 : 2)

const initialState: ProgressionState = {
  collectedFragments: [],
  tombKeys: {},
  discoveredTombs: AUTO_DISCOVERED_TOMBS,
  collectedMapPieces: {},
  mapPieceJourneys: [],
  consumables: { bandage: 0, oil: 0, trapTool: 0 },
  trapPerks: INITIAL_TRAP_PERKS,
  puzzlePerks: INITIAL_PUZZLE_PERKS,
  corePerks: INITIAL_CORE_PERKS,
  ledger: DEFAULT_LEDGER,
}

const PERK_SLICE_DEFAULTS: Record<PerkSlice, Record<string, number>> = {
  trapPerks: INITIAL_TRAP_PERKS,
  puzzlePerks: INITIAL_PUZZLE_PERKS,
  corePerks: INITIAL_CORE_PERKS,
}

export type ProgressionAPI = {
  addFragment: (hieroglyphId: string, pieceIndex: number) => void
  hasFragment: (hieroglyphId: string, pieceIndex: number) => boolean
  isHieroglyphComplete: (hieroglyphId: string) => boolean
  hieroglyphProgress: (hieroglyphId: string) => { found: number; required: number }
  hieroglyphFragments: Record<string, number>
  hasTombKey: (treasureId: string) => boolean
  addTombKey: (treasureId: string) => void
  applyTreasurePerk: (treasureId: string) => void
  tombKeyIds: ReadonlySet<string>
  isTombDiscovered: (tombJourneyId: string) => boolean
  discoverTomb: (tombJourneyId: string) => void
  mosaicPieceCount: number
  collectMosaicPiece: () => void
  collectMapPiece: (tombId: string) => void
  mapPieceCount: (tombId: string) => number
  hasMapPiece: (journeyId: string) => boolean
  markMapPieceFound: (journeyId: string) => void
  currentHealth: number
  maxHealth: number
  canAttemptTrap: () => boolean
  takeTrapDamage: (armorStacks: number) => void
  heal: (halfHearts: number) => void
  healToFull: () => void
  consumables: ConsumableInventory
  consumableCarryCap: number
  isConsumablePackFull: () => boolean
  addConsumable: (type: ConsumableType) => boolean // false if at cap
  useConsumable: (type: ConsumableType) => void
  perks: PerkState
  money: number
  addMoney: (amount: number) => void
  spendMoney: (amount: number) => boolean // false if insufficient funds
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
      addFragment: (hieroglyphId, pieceIndex) => {
        const key = `${hieroglyphId}:${pieceIndex}`
        setState(prev =>
          prev.collectedFragments.includes(key)
            ? prev
            : { ...prev, collectedFragments: [...prev.collectedFragments, key] }
        )
      },
      hasFragment: (hieroglyphId, pieceIndex) => state.collectedFragments.includes(`${hieroglyphId}:${pieceIndex}`),
      isHieroglyphComplete: hieroglyphId => {
        const count = state.collectedFragments.filter(f => f.startsWith(`${hieroglyphId}:`)).length
        return count >= (hieroglyphRequired[hieroglyphId] ?? 2)
      },
      hieroglyphProgress: hieroglyphId => ({
        found: state.collectedFragments.filter(f => f.startsWith(`${hieroglyphId}:`)).length,
        required: hieroglyphRequired[hieroglyphId] ?? 2,
      }),
      hieroglyphFragments: Object.fromEntries(
        state.collectedFragments
          .map(f => f.split(":")[0])
          .reduce((m, id) => {
            m.set(id, (m.get(id) ?? 0) + 1)
            return m
          }, new Map<string, number>())
      ),
      hasTombKey: treasureId => !!state.tombKeys[treasureId],
      addTombKey: treasureId => setState(prev => ({ ...prev, tombKeys: { ...prev.tombKeys, [treasureId]: true } })),
      // Grant side (core-owned authored data: treasureId -> perk id/level, see data/treasurePerks.ts)
      // reads which slice/field the perk registry says it belongs to and writes the bumped
      // value there — no perk name is hardcoded here, that knowledge lives only in the registry.
      applyTreasurePerk: treasureId =>
        setState(prev => {
          const perk = TREASURE_PERKS[treasureId]
          const meta = perk && getPerkMeta(perk.type)
          if (!meta) return prev
          const slice = (prev[meta.slice] ?? PERK_SLICE_DEFAULTS[meta.slice]) as Record<string, number>
          const grantedLevel = "level" in perk ? perk.level : undefined
          const next = meta.bump(slice[meta.field] ?? 0, grantedLevel)
          return { ...prev, [meta.slice]: { ...slice, [meta.field]: next } }
        }),
      tombKeyIds: new Set(Object.keys(state.tombKeys)),
      isTombDiscovered: tombJourneyId => state.discoveredTombs.includes(tombJourneyId),
      discoverTomb: tombJourneyId =>
        setState(prev => ({
          ...prev,
          discoveredTombs: prev.discoveredTombs.includes(tombJourneyId)
            ? prev.discoveredTombs
            : [...prev.discoveredTombs, tombJourneyId],
        })),
      mosaicPieceCount: ledger.get("mosaicPiece"),
      collectMosaicPiece: () => ledger.grant("mosaicPiece", 1),
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
      currentHealth: ledger.get("health"),
      maxHealth: trapPerks.maxHealth,
      canAttemptTrap: () => canAttemptTrap(ledger.get("health")),
      takeTrapDamage: armorStacks =>
        setState(prev => {
          const prevLedger = prev.ledger ?? DEFAULT_LEDGER
          return {
            ...prev,
            ledger: { ...prevLedger, health: Math.max(0, prevLedger.health - trapDamage(armorStacks)) },
          }
        }),
      heal: halfHearts =>
        setState(prev => {
          const prevLedger = prev.ledger ?? DEFAULT_LEDGER
          const maxHealth = (prev.trapPerks ?? INITIAL_TRAP_PERKS).maxHealth
          return { ...prev, ledger: { ...prevLedger, health: Math.min(maxHealth, prevLedger.health + halfHearts) } }
        }),
      healToFull: () =>
        setState(prev => {
          const maxHealth = (prev.trapPerks ?? INITIAL_TRAP_PERKS).maxHealth
          return { ...prev, ledger: { ...(prev.ledger ?? DEFAULT_LEDGER), health: maxHealth } }
        }),
      consumables: state.consumables ?? { bandage: 0, oil: 0, trapTool: 0 },
      consumableCarryCap: consumableCarryCap(trapPerks.packMuleLevel),
      isConsumablePackFull: () => {
        const inv = state.consumables ?? { bandage: 0, oil: 0, trapTool: 0 }
        const cap = consumableCarryCap(trapPerks.packMuleLevel)
        return inv.bandage + inv.oil + inv.trapTool >= cap
      },
      addConsumable: type => {
        const inv = state.consumables ?? { bandage: 0, oil: 0, trapTool: 0 }
        const cap = consumableCarryCap(trapPerks.packMuleLevel)
        if (inv.bandage + inv.oil + inv.trapTool >= cap) return false
        setState(prev => {
          const c = prev.consumables ?? { bandage: 0, oil: 0, trapTool: 0 }
          return { ...prev, consumables: { ...c, [type]: c[type] + 1 } }
        })
        return true
      },
      useConsumable: type =>
        setState(prev => {
          const c = prev.consumables ?? { bandage: 0, oil: 0, trapTool: 0 }
          if (c[type] <= 0) return prev
          const next = { ...c, [type]: c[type] - 1 }
          const prevLedger = prev.ledger ?? DEFAULT_LEDGER
          const maxHealth = (prev.trapPerks ?? INITIAL_TRAP_PERKS).maxHealth
          const healed =
            type === "bandage"
              ? Math.min(maxHealth, prevLedger.health + 2)
              : type === "oil"
                ? maxHealth
                : prevLedger.health
          return { ...prev, consumables: next, ledger: { ...prevLedger, health: healed } }
        }),
      perks: {
        armorStacks: trapPerks.armorStacks,
        trapInsightStacks: trapPerks.trapInsightStacks,
        packMuleLevel: trapPerks.packMuleLevel,
        compassLevel: corePerks.compassLevel,
        consumableDetectorLevel: corePerks.consumableDetectorLevel,
        detectionLevel: corePerks.detectionLevel,
        scribesEyeLevel: puzzlePerks.scribesEyeLevel,
      },
      money: ledger.get("money"),
      addMoney: amount => ledger.grant("money", amount),
      spendMoney: amount => ledger.spend("money", amount),
    }
  }, [state, setState])
}
