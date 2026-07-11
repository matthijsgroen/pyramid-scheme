import type { SiteConfig, Tier } from "@/worldGen/types"
import type { CurrencyDemand, CurrencyDistribution } from "@/worldGen/placeFragments"
import { hieroglyphBucket } from "@/worldGen/reachability"
import { TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "@/worldGen/data"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import { tableauLevels } from "@/data/tableaus"

// The hieroglyph-fragment currency, owned by the tableau mod (not core world-gen) —
// docs/mods-architecture.md, "Currencies are mod-owned, not a closed core vocabulary".
// This is the currency's own authored placement preference (the doc's step 2a), the one
// piece of domain knowledge ("which tier, which ward keys, how many") the generic
// worklist in src/worldGen/placeFragments.ts never needs to know.

const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

// For each hieroglyph: which tier it belongs to, how many fragments it needs, and which
// ward keys (earned by completing earlier tomb runs) its preferred placement slots sit
// behind — derived once from tableauLevels/TOMB_PERK_IDS, not authored per-hieroglyph.
const buildHieroglyphDemands = (existing: Map<string, number>): CurrencyDemand[] => {
  const demands: CurrencyDemand[] = []
  const seen = new Set<string>()

  for (const tier of TIERS) {
    const tombId = `${tier}_treasure_tomb`
    const tombPerkIds = TOMB_PERK_IDS[tombId] ?? []

    for (const hieroglyphId of TOMB_SYMBOLS[tier]) {
      if (seen.has(hieroglyphId)) continue
      seen.add(hieroglyphId)

      const firstRunNumber = tableauLevels
        .filter(t => t.tombJourneyId === tombId && t.inventoryIds.includes(hieroglyphId))
        .reduce((min, t) => Math.min(min, t.runNumber), Infinity)
      const runNumber = isFinite(firstRunNumber) ? firstRunNumber : 1
      const preferredWardKeys = tombPerkIds.slice(0, runNumber - 1)

      const totalRequired = HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2
      const required = totalRequired - (existing.get(hieroglyphId) ?? 0)
      demands.push({ instanceId: hieroglyphId, tier, preferredWardKeys, required, totalRequired })
    }
  }

  return demands
}

// hieroglyphFragment rewards already authored directly (bypassing fragmentSlot entirely —
// e.g. a Fez-shop stock literal) — subtracted from each hieroglyph's required count so the
// world-wide total stays exactly right regardless of how many were placed this way.
const countExistingFragments = (allConfigs: Record<string, SiteConfig[]>): Map<string, number> => {
  const counts = new Map<string, number>()
  const bump = (r?: { type: string; hieroglyphId?: string }) => {
    if (r?.type === "hieroglyphFragment" && r.hieroglyphId)
      counts.set(r.hieroglyphId, (counts.get(r.hieroglyphId) ?? 0) + 1)
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

export const HIEROGLYPH_CURRENCY: CurrencyDistribution = {
  bucket: hieroglyphBucket,
  toReward: hieroglyphId => ({ type: "hieroglyphFragment", hieroglyphId }),
  demands: allConfigs => buildHieroglyphDemands(countExistingFragments(allConfigs)),
}
