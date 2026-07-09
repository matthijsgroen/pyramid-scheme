import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { hieroglyphRequired } from "@/data/generatedWorld"
import type { ConsumableType } from "@/game/siteTypes"
import { TREASURE_PERKS } from "@/data/treasurePerks"

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

const INITIAL_PERKS: PerkState = {
  armorStacks: 0,
  trapInsightStacks: 0,
  packMuleLevel: 0,
  compassLevel: 0,
  consumableDetectorLevel: 0,
  detectionLevel: 0,
  scribesEyeLevel: 0,
}

type ProgressionState = {
  // "hieroglyphId:pieceIndex" entries — inventory-as-truth for chest loot
  collectedFragments: string[]
  tombKeys: Record<string, true>
  discoveredTombs: string[]
  mosaicSeenCount: number
  mosaicPieceCount: number
  collectedMapPieces: Record<string, number>
  // journeyIds whose map-piece chest has been opened — inventory-as-truth for the journey list badge
  mapPieceJourneys: string[]
  currentHealth: number // half-hearts
  maxHealth: number // half-hearts
  consumables: ConsumableInventory
  perks: PerkState
  money: number
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
  mosaicSeenCount: 0,
  mosaicPieceCount: 0,
  collectedMapPieces: {},
  mapPieceJourneys: [],
  currentHealth: 6,
  maxHealth: 6,
  consumables: { bandage: 0, oil: 0, trapTool: 0 },
  perks: INITIAL_PERKS,
  money: 0,
}

export const trapDamage = (armorStacks: number): number => Math.max(1, 2 - armorStacks)
export const canAttemptTrap = (currentHealth: number): boolean => currentHealth >= 2

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
  mosaicSeenCount: number
  mosaicPieceCount: number
  collectMosaicPiece: () => void
  markMosaicViewed: (count: number) => void
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
  addConsumable: (type: ConsumableType) => boolean // false if at cap
  useConsumable: (type: ConsumableType) => void
  perks: PerkState
  money: number
  addMoney: (amount: number) => void
  spendMoney: (amount: number) => boolean // false if insufficient funds
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v4", initialState)

  return useMemo(
    () => ({
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
      applyTreasurePerk: treasureId =>
        setState(prev => {
          const perk = TREASURE_PERKS[treasureId]
          if (!perk || perk.type === "none" || perk.type === "location-key" || perk.type === "tier-unlock") return prev
          const p = prev.perks ?? INITIAL_PERKS
          switch (perk.type) {
            case "max-health":
              return { ...prev, maxHealth: Math.min(12, (prev.maxHealth ?? 6) + 1) }
            case "armor":
              return { ...prev, perks: { ...p, armorStacks: Math.min(2, p.armorStacks + 1) } }
            case "trap-insight":
              return { ...prev, perks: { ...p, trapInsightStacks: Math.min(2, p.trapInsightStacks + 1) } }
            case "pack-mule":
              return { ...prev, perks: { ...p, packMuleLevel: 1 } }
            case "compass":
              return { ...prev, perks: { ...p, compassLevel: Math.max(p.compassLevel, perk.level) } }
            case "consumable-detector":
              return {
                ...prev,
                perks: { ...p, consumableDetectorLevel: Math.max(p.consumableDetectorLevel, perk.level) },
              }
            case "scribes-eye":
              return { ...prev, perks: { ...p, scribesEyeLevel: Math.max(p.scribesEyeLevel, perk.level) } }
            case "detection":
              return { ...prev, perks: { ...p, detectionLevel: Math.max(p.detectionLevel, perk.level) } }
          }
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
      hasMapPiece: journeyId => (state.mapPieceJourneys ?? []).includes(journeyId),
      markMapPieceFound: journeyId =>
        setState(prev =>
          (prev.mapPieceJourneys ?? []).includes(journeyId)
            ? prev
            : { ...prev, mapPieceJourneys: [...(prev.mapPieceJourneys ?? []), journeyId] }
        ),
      currentHealth: state.currentHealth ?? 6,
      maxHealth: state.maxHealth ?? 6,
      canAttemptTrap: () => canAttemptTrap(state.currentHealth ?? 6),
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
      consumables: state.consumables ?? { bandage: 0, oil: 0, trapTool: 0 },
      consumableCarryCap: consumableCarryCap(state.perks?.packMuleLevel ?? 0),
      addConsumable: type => {
        const inv = state.consumables ?? { bandage: 0, oil: 0, trapTool: 0 }
        const cap = consumableCarryCap(state.perks?.packMuleLevel ?? 0)
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
          const healed =
            type === "bandage"
              ? Math.min(prev.maxHealth ?? 6, (prev.currentHealth ?? 6) + 2)
              : type === "oil"
                ? (prev.maxHealth ?? 6)
                : (prev.currentHealth ?? 6)
          return { ...prev, consumables: next, currentHealth: healed }
        }),
      perks: state.perks ?? INITIAL_PERKS,
      money: state.money ?? 0,
      addMoney: amount => setState(prev => ({ ...prev, money: (prev.money ?? 0) + amount })),
      spendMoney: amount => {
        if ((state.money ?? 0) < amount) return false
        setState(prev => ({ ...prev, money: (prev.money ?? 0) - amount }))
        return true
      },
    }),
    [state, setState]
  )
}
