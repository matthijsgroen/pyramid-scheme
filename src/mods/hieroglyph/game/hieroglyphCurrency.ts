import type { SiteConfig, Tier } from "@/worldGen/types"
import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import type { Slot } from "@/worldGen/slots"
import { pipe, rankBy, uniqueBy, preferThenRelax, filterBy } from "@/worldGen/distribution"
import { TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import { tableauLevels } from "@/data/tableaus"
import { TOMB_JOURNEYS } from "@/worldGen/data"

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

// Tier lookup by hieroglyph id — this fragment's HARD placement constraint (a slot's own
// authored difficulty must equal this, not just its journey's — see slots.ts's own tier
// comment), not a demand list; a hieroglyph never referenced by any authored tableau just
// never gets discovered, and this table is never iterated to find that out.
const TIER_BY_HIEROGLYPH: Record<string, Tier> = (() => {
  const result: Record<string, Tier> = {}
  for (const [tier, ids] of Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]) {
    for (const id of ids) result[id] = tier
  }
  return result
})()

// Which ward keys (earned by completing earlier tomb runs) this hieroglyph's preferred
// placement slots sit behind — derived from tableauLevels/TOMB_PERK_IDS, not authored
// per-hieroglyph. Searches every tomb of the tier (not just the primary `${tier}_treasure_tomb`)
// and takes the perk ids of whichever tomb the glyph is actually first needed in — mirrors
// HIEROGLYPH_REQUIRED's own tomb search (hieroglyphData.ts), since a symbol that only appears in
// a tier's secondary tomb would otherwise never get a ward preference at all.
const preferredWardKeysFor = (tier: Tier, hieroglyphId: string): string[] => {
  const tierTombIds = new Set(TOMB_JOURNEYS.filter(j => j.tier === tier).map(j => j.id))
  const first = tableauLevels
    .filter(t => tierTombIds.has(t.tombJourneyId) && t.inventoryIds.includes(hieroglyphId))
    .reduce<(typeof tableauLevels)[number] | undefined>(
      (best, t) => (!best || t.runNumber < best.runNumber ? t : best),
      undefined
    )
  if (!first) return []
  return (TOMB_PERK_IDS[first.tombJourneyId] ?? []).slice(0, first.runNumber - 1)
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
    // Unreachable today (TIER_BY_HIEROGLYPH covers every id any tableau references) — a clear
    // error beats rank() silently filtering every candidate out via an undefined tier match.
    if (!tier) throw new Error(`hieroglyph: bucket "${bucket}" names no hieroglyph in TOMB_SYMBOLS`)
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
  // A hieroglyph's tier is a HARD constraint, not a ranking preference: a fragment may only land
  // in a slot whose OWN authored difficulty is this hieroglyph's tier (slots.ts's `tier` — the
  // floor/section's marked difficulty, not its journey's native tier). So the legitimate homes are
  // the tier's own pyramids/tombs AND any deliberately cross-tier-authored floor or ward pocket
  // marked with this difficulty (a master wing inside a starter pyramid counts; the starter pyramid
  // around it does not) — realizes keys-and-locks-solver.md's own rule shape for this currency.
  //
  // Inside the tier, two soft rungs remain: ward-key/preference score, then dedup. Dedup keeps at
  // most ONE ward-matched slot per distinct matched key (never two fragments behind the identical
  // key — a symbol needed deep in its tomb's tableau chain can hold back one fragment per floor
  // instead of piling them all behind the first), and per-PYRAMID for everything else (a
  // hieroglyph needs more fragments, up to 8, than a tier has journeys, 4, so one-per-journey
  // forced the surplus cross-tier; per-pyramid keeps them spread out — no two fragments of one
  // hieroglyph in the same pyramid — while still fitting comfortably inside the tier). Both rungs
  // are soft: preferThenRelax's tail still allows a repeat if the tier ever runs short, rather than
  // failing placement outright.
  rank: (candidates, demand) => {
    const byPoolScore = rankBy<Slot>(s => {
      const wardMatch =
        demand.preferredWardKeys.length > 0 && s.wardKeys.some(k => demand.preferredWardKeys.includes(k))
      // A slot preferring this exact hieroglyph (`hieroglyph:ra`) or any hieroglyph
      // (bare `hieroglyph`) is ranked above untagged ones — the DSL's soft placement wish.
      const prefMatch = s.preference === demand.bucket || s.preference === CURRENCY_ID
      return (wardMatch ? 1 : 0) + (prefMatch ? 1 : 0)
    })
    return pipe<Slot>(
      filterBy(s => s.tier === demand.tier),
      preferThenRelax(
        pipe(
          byPoolScore,
          uniqueBy(s => {
            const matchedKey = s.wardKeys.find(k => demand.preferredWardKeys.includes(k))
            return matchedKey ? `__ward__:${matchedKey}` : `${s.journeyId}#${s.ref.levelIndex}`
          })
        ),
        byPoolScore
      )
    )(candidates)
  },
}
