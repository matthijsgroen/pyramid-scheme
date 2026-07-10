import type { SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { tableauLevels } from "../data/tableaus"
import { hashStr } from "./rewards"
import { capabilitiesFor } from "./capabilities"
import { sellablesForDifficulty } from "../data/sellables"
import type { Difficulty } from "../data/difficultyLevels"

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

// Counts hieroglyphFragment rewards already authored directly (bypassing fragmentSlot
// entirely — e.g. a Fez-shop slot literal-authored via `endReward:"hieroglyphFragment"`,
// SHOP_PLAN.md's "reserve against the fragment fallback back-fill" — a direct reward is
// never at risk of losing the fragmentSlot/available pool's competition to junk loot).
// Subtracted from each hieroglyph's `required` count below so the world-wide total stays
// exactly EXPECTED_HIEROGLYPH_FRAGMENTS regardless of how many were placed this way.
const countExistingHieroglyphFragments = (allConfigs: Record<string, SiteConfig[]>): Map<string, number> => {
  const counts = new Map<string, number>()
  const bump = (r?: TreasureReward) => {
    if (r?.type === "hieroglyphFragment") counts.set(r.hieroglyphId, (counts.get(r.hieroglyphId) ?? 0) + 1)
  }
  for (const siteConfigs of Object.values(allConfigs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        bump(floor.mainEndReward)
        for (const s of floor.sideSections) {
          bump(s.endReward)
          for (const sub of s.sideSections ?? []) bump(sub.endReward)
        }
      }
    }
  }
  return counts
}

// Mutates allConfigs in place: assigns hieroglyphFragment rewards to fragmentSlot sentinels
// and open ward gates, then fills any remaining placeholder slots with consumables.
export const assignFragments = (allConfigs: Record<string, SiteConfig[]>): void => {
  const slots = collectSlots(allConfigs)
  const infos = buildPlacementInfos()
  const available = [...slots]
  const existing = countExistingHieroglyphFragments(allConfigs)

  const placedInJourney = new Map<string, Set<string>>()
  for (const j of [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS]) placedInJourney.set(j.id, new Set())

  let totalPlaced = 0

  for (const info of infos) {
    const needed = info.required - (existing.get(info.hieroglyphId) ?? 0)
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
  totalPlaced += [...existing.values()].reduce((a, b) => a + b, 0)

  // Fill every remaining slot with junk loot — both fragmentSlot placeholders and open
  // ward-gate slots that no fragment reached. Otherwise an unclaimed ward gate renders a
  // generic (untracked) hieroglyphs room instead of real loot. Tiered by the slot's own
  // journey tier (SHOP_PLAN.md "World reshape") — sellable, not consumable: consumables
  // moved to puzzle-solve rewards, end-of-path slots are the junk-loot channel now.
  let fallbackIdx = 0
  for (const slot of available) {
    const items = sellablesForDifficulty(slot.tier as Difficulty)
    const item = items[hashStr(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`) % items.length]
    slot.assign({ type: "sellable", itemId: item.id })
  }

  console.log(`  ✓ Fragment assignment: ${totalPlaced} fragments placed`)
}
