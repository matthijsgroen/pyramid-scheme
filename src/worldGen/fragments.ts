import type { SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { tableauLevels } from "../data/tableaus"
import { GLOBAL_DEFAULTS } from "./spec/global"
import { rollConsumable } from "./rewards"
import { capabilitiesFor } from "./capabilities"

const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

export type SlotRef = {
  journeyId: string
  tier: Tier
  journeyOrderIndex: number
  wardKeys: string[]
  isPlaceholder: boolean
  assign: (r: TreasureReward) => void
}

export type HieroglyphPlacementInfo = {
  hieroglyphId: string
  tier: Tier
  preferredWardKeys: string[]
  required: number
}

// Collects every fragmentSlot sentinel across all sites that opt into the emitFragmentSlots
// capability (see ./capabilities) plus every open tomb-key ward gate, as assignable refs.
export const collectSlots = (allConfigs: Record<string, SiteConfig[]>): SlotRef[] => {
  const slots: SlotRef[] = []

  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    if (!capabilitiesFor(journeyId)?.emitFragmentSlots) continue
    const pyramidJourney = PYRAMID_JOURNEYS.find(j => j.id === journeyId)
    const tombJourney = TOMB_JOURNEYS.find(j => j.id === journeyId)
    const tier = (pyramidJourney ?? tombJourney)!.tier as Tier
    // Unused elsewhere today; pyramids get their real ordering, tombs a stable sentinel.
    const journeyOrderIndex = pyramidJourney ? PYRAMID_JOURNEYS.indexOf(pyramidJourney) : -1

    const addSlot = (wardKeys: string[], isPlaceholder: boolean, assign: (r: TreasureReward) => void) =>
      slots.push({ journeyId, tier, journeyOrderIndex, wardKeys, isPlaceholder, assign })

    for (const floors of siteConfigs) {
      for (const floor of floors) {
        if (floor.mainEndReward?.type === "fragmentSlot") {
          const f = floor
          addSlot([], true, r => {
            f.mainEndReward = r
          })
        }
        for (const section of floor.sideSections) {
          const sWardKeys = section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []
          if (section.endReward?.type === "fragmentSlot") {
            const s = section
            addSlot(sWardKeys, true, r => {
              s.endReward = r
            })
          } else if (section.gate?.type === "tomb-key" && !section.endReward) {
            const s = section
            addSlot(sWardKeys, false, r => {
              s.endReward = r
            })
          }
          for (const sub of section.sideSections ?? []) {
            const subWardKeys = [...sWardKeys, ...(sub.gate?.type === "tomb-key" ? [sub.gate.wardKeyId] : [])]
            if (sub.endReward?.type === "fragmentSlot") {
              const ss = sub
              addSlot(subWardKeys, true, r => {
                ss.endReward = r
              })
            } else if (sub.gate?.type === "tomb-key" && !sub.endReward) {
              const ss = sub
              addSlot(subWardKeys, false, r => {
                ss.endReward = r
              })
            }
          }
        }
      }
    }
  }

  return slots
}

// For each hieroglyph, the tier it belongs to, how many fragments it needs, and which ward
// keys (earned by completing earlier tomb runs) should gate its preferred placement slots.
export const buildPlacementInfos = (): HieroglyphPlacementInfo[] => {
  const infos: HieroglyphPlacementInfo[] = []
  const seen = new Set<string>()

  for (const tier of TIERS) {
    const tombId = `${tier}_treasure_tomb`
    const tombPerkIds = TOMB_PERK_IDS[tombId] ?? []

    for (const hieroglyphId of TOMB_SYMBOLS[tier as Tier]) {
      if (seen.has(hieroglyphId)) continue
      seen.add(hieroglyphId)

      const firstRunNumber = tableauLevels
        .filter(t => t.tombJourneyId === tombId && t.inventoryIds.includes(hieroglyphId))
        .reduce((min, t) => Math.min(min, t.runNumber), Infinity)

      const runNumber = isFinite(firstRunNumber) ? firstRunNumber : 1
      // Ward keys earned after completing runs 1..(runNumber-1) gate the preferred slots.
      // run 1 → no wards needed; run 2 → tombPerkIds[0]; run 3 → tombPerkIds[0..1]; etc.
      const preferredWardKeys = tombPerkIds.slice(0, runNumber - 1)

      infos.push({
        hieroglyphId,
        tier: tier as Tier,
        preferredWardKeys,
        required: HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2,
      })
    }
  }

  return infos
}

// Mutates allConfigs in place: assigns hieroglyphFragment rewards to fragmentSlot sentinels
// and open ward gates, then fills any remaining placeholder slots with consumables.
export const assignFragments = (allConfigs: Record<string, SiteConfig[]>): void => {
  const slots = collectSlots(allConfigs)
  const infos = buildPlacementInfos()
  const available = [...slots]

  const placedInJourney = new Map<string, Set<string>>()
  for (const j of [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS]) placedInJourney.set(j.id, new Set())

  let totalPlaced = 0

  for (const info of infos) {
    const needed = info.required
    let placed = 0

    // Pools in priority order:
    // 0 — tier-matching slots behind preferred ward keys (run 2+ fragments go here first)
    // 1 — tier-matching open slots (no ward)
    // 2 — any remaining slots (cross-tier fallback)
    const pools = [
      available.filter(
        s =>
          s.tier === info.tier &&
          info.preferredWardKeys.length > 0 &&
          s.wardKeys.some(k => info.preferredWardKeys.includes(k))
      ),
      available.filter(s => s.tier === info.tier && s.wardKeys.length === 0),
      available.filter(s => s.tier !== info.tier),
    ]

    for (const pool of pools) {
      if (placed >= needed) break

      // First pass: respect 1-per-journey
      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        if (placedInJourney.get(slot.journeyId)?.has(info.hieroglyphId)) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        placedInJourney.get(slot.journeyId)!.add(info.hieroglyphId)
        available.splice(idx, 1)
        placed++
      }

      if (placed >= needed) break

      // Second pass: relax 1-per-journey if pool exhausted
      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        available.splice(idx, 1)
        placed++
      }
    }

    totalPlaced += placed
    if (placed < needed) {
      console.warn(`  ⚠ ${info.hieroglyphId} (${info.tier}): placed ${placed}/${needed} — not enough fragment slots`)
    }
  }

  // Fill remaining placeholder slots with consumables
  const rates = GLOBAL_DEFAULTS.consumableRates
  let fallbackIdx = 0
  for (const slot of available) {
    if (!slot.isPlaceholder) continue
    const consumable = rollConsumable(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`, rates)
    slot.assign({ type: "consumable", consumable })
  }

  console.log(`  ✓ Fragment assignment: ${totalPlaced} fragments placed`)
}
