import type { SiteConfig, Tier } from "@/worldGen/types"
import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import type { Slot } from "@/worldGen/slots"
import { pipe, rankBy, uniqueBy, preferThenRelax } from "@/worldGen/distribution"
import { TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import { tableauLevels } from "@/data/tableaus"

// The hieroglyph-fragment currency, owned by the tableau mod (not core world-gen) —
// docs/mods/ARCHITECTURE.md, "Currencies are mod-owned, not a closed core vocabulary".
// This is the currency's own authored placement preference (the doc's step 2a), the one
// piece of domain knowledge ("which tier, which ward keys, how many") the generic
// worklist in src/worldGen/placeFragments.ts never needs to know.
//
// Which hieroglyphs actually need placing is never enumerated here — that's discovered
// reactively by the worklist queue hitting a tableau's own requiredKeyIds (resolveTableau-
// KeyRequirements' output, "hieroglyph:${id}"), per keys-and-locks-solver.md's "Structure,
// then loot". This module only answers "given a discovered hieroglyph bucket, how many
// fragments total, and where does it prefer to land" — ranking metadata, not demand discovery.

// Unified bucket/preference grammar: `"hieroglyph"` = any hieroglyph, `"hieroglyph:ra"` = Ra.
const CURRENCY_ID = "hieroglyph"
const BUCKET_PREFIX = `${CURRENCY_ID}:`

// The world-wide total this currency must place — this mod's own number (validate.ts takes
// it as an injected parameter, never imports a hardcoded expectation itself).
export const EXPECTED_HIEROGLYPH_FRAGMENTS = Object.values(HIEROGLYPH_REQUIRED).reduce((a, b) => a + b, 0)

// Display/ownership metadata for the fragment currency — the ledger + shared Collection screen
// read this (registered via the mod descriptor, so toggling the mod off drops it too). One
// counter across all hieroglyphs, not per-id; the per-hieroglyph `hieroglyph:<id>` buckets are a
// world-gen placement detail, invisible here. `showInCollection` opts it into the Collection grid.
export const HIEROGLYPH_CURRENCY_META: CurrencyMeta = {
  id: "fragment",
  ownerMod: "hieroglyph",
  displayName: "currency.fragment",
  icon: "𓂀",
  kind: "capped",
  total: EXPECTED_HIEROGLYPH_FRAGMENTS,
  showInCollection: true,
}

// Tier lookup by hieroglyph id — ranking metadata (which corridors this fragment prefers),
// not a demand list; a hieroglyph never referenced by any authored tableau just never gets
// discovered, and this table is never iterated to find that out.
const TIER_BY_HIEROGLYPH: Record<string, Tier> = (() => {
  const result: Record<string, Tier> = {}
  for (const [tier, ids] of Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]) {
    for (const id of ids) result[id] = tier
  }
  return result
})()

// Which ward keys (earned by completing earlier tomb runs) this hieroglyph's preferred
// placement slots sit behind — derived from tableauLevels/TOMB_PERK_IDS, not authored
// per-hieroglyph.
const preferredWardKeysFor = (tier: Tier, hieroglyphId: string): string[] => {
  const tombId = `${tier}_treasure_tomb`
  const tombPerkIds = TOMB_PERK_IDS[tombId] ?? []
  const firstRunNumber = tableauLevels
    .filter(t => t.tombJourneyId === tombId && t.inventoryIds.includes(hieroglyphId))
    .reduce((min, t) => Math.min(min, t.runNumber), Infinity)
  const runNumber = isFinite(firstRunNumber) ? firstRunNumber : 1
  return tombPerkIds.slice(0, runNumber - 1)
}

// hieroglyphFragment rewards already authored directly (bypassing fragmentSlot entirely —
// e.g. a Fez-shop stock literal) — subtracted from the required count so the world-wide
// total stays exactly right regardless of how many were placed this way.
const countExisting = (allConfigs: Record<string, SiteConfig[]>, hieroglyphId: string): number => {
  let count = 0
  const bump = (r?: { type: string; hieroglyphId?: string }) => {
    if (r?.type === "hieroglyphFragment" && r.hieroglyphId === hieroglyphId) count++
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
  return count
}

export const HIEROGLYPH_CURRENCY: CurrencyDistribution = {
  ownsBucket: bucket => bucket === CURRENCY_ID || bucket.startsWith(BUCKET_PREFIX),
  toReward: hieroglyphId => ({ type: "hieroglyphFragment", hieroglyphId }),
  // The gate threshold reachability injects: a tableau needs this many fragments of this
  // hieroglyph. Matches demandFor's totalRequired so a gate opens exactly when its fragments
  // are placed. This is the mod's own number — core reachability reads it only via injection.
  thresholdFor: bucket => HIEROGLYPH_REQUIRED[bucket.slice(BUCKET_PREFIX.length)] ?? 2,
  // Harvest mapping reachability injects: a hieroglyph-fragment reward counts toward its
  // `hieroglyph:<id>` bucket.
  bucketForReward: reward =>
    reward.type === "hieroglyphFragment" ? `${BUCKET_PREFIX}${reward.hieroglyphId}` : undefined,
  // The world-wide count the reward-count check expects — this mod's own number.
  expectedTotal: () => EXPECTED_HIEROGLYPH_FRAGMENTS,
  demandFor: (bucket, allConfigs) => {
    const hieroglyphId = bucket.slice(BUCKET_PREFIX.length)
    const tier = TIER_BY_HIEROGLYPH[hieroglyphId]
    const totalRequired = HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2
    const required = totalRequired - countExisting(allConfigs, hieroglyphId)
    return {
      bucket,
      instanceId: hieroglyphId,
      tier,
      preferredWardKeys: preferredWardKeysFor(tier, hieroglyphId),
      required,
      totalRequired,
    }
  },
  // Pool priority (tier+preferred-ward > tier-only > cross-tier) as a rank score — the doc's
  // own composable-rule shape. Ranked BEFORE deduping by journey, so the "one per journey"
  // strict pass keeps each journey's best-scoring slot, not an arbitrary one.
  rank: (candidates, demand) => {
    const byPoolScore = rankBy<Slot>(s => {
      const tierMatch = s.tier === demand.tier
      const wardMatch =
        demand.preferredWardKeys.length > 0 && s.wardKeys.some(k => demand.preferredWardKeys.includes(k))
      // A slot preferring this exact hieroglyph (`hieroglyph:ra`) or any hieroglyph
      // (bare `hieroglyph`) is ranked above untagged ones — the DSL's soft placement wish.
      const prefMatch = s.preference === demand.bucket || s.preference === CURRENCY_ID
      return (tierMatch ? 1 : 0) + (tierMatch && wardMatch ? 1 : 0) + (prefMatch ? 1 : 0)
    })
    return pipe<Slot>(
      preferThenRelax(
        pipe(
          byPoolScore,
          uniqueBy(s => s.journeyId)
        ),
        byPoolScore
      )
    )(candidates)
  },
}
