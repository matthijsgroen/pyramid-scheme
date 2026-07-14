import type { Tier } from "@/worldGen/types"
import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import type { Slot } from "@/worldGen/slots"
import { pipe, rankBy, uniqueBy, preferThenRelax } from "@/worldGen/distribution"
import { TOMB_JOURNEYS } from "@/worldGen/data"
import { journeys as REAL_JOURNEYS } from "@/data/journeys"

// The map-piece currency — owned by the tomb-treasure mod (found in pyramids, unlocks a tomb's
// entry). A CurrencyDistribution on the reachability worklist, the SAME shape as hieroglyph
// fragments; see docs/mods/ARCHITECTURE.md, "Currencies are mod-owned, not a closed core
// vocabulary" and docs/game-design/keys-and-locks-solver.md, "Map piece placement": a two-level
// diversity ladder (spread across journeys first, relax to a different pyramid within an
// already-used journey), not a single dedup level.

// Unified bucket/preference grammar: `"mapPiece"` = any map piece, `"mapPiece:<tombId>"` = that
// tomb's. The pyramid's authored map-piece branch emits a fragmentSlot sentinel tagged
// `mapPiece:<tombId>` (src/worldGen/sideSections.ts) — this currency's rank prefers it, so the
// branch fills with a map piece without core world-gen ever naming the reward type.
const CURRENCY_ID = "mapPiece"
const BUCKET_PREFIX = `${CURRENCY_ID}:`

// Display/ownership metadata for the map-piece currency — the ledger + Travel/collection UI read
// this (registered via the mod descriptor, so toggling the mod off drops it too). `total` is the
// tomb count (one map-piece progress track per treasure tomb).
export const MAP_PIECE_CURRENCY_META: CurrencyMeta = {
  id: "mapPiece",
  ownerMod: "tomb-treasure",
  displayName: "currency.mapPiece",
  icon: "📜",
  kind: "capped",
  total: REAL_JOURNEYS.filter(j => j.type === "treasure_tomb").length,
}

export const MAP_PIECE_CURRENCY: CurrencyDistribution = {
  ownsBucket: bucket => bucket === CURRENCY_ID || bucket.startsWith(BUCKET_PREFIX),
  toReward: tombId => ({ type: "mapPiece", tombId }),
  // NOTE: no `bucketForReward` here — map-piece harvest rides the mod's reachabilitySupport
  // (game/reachabilitySupport.ts) alongside tomb keys, deliberately NOT the currency. Reason:
  // buildConfigs' `isCurrencyReward` count check keys on `bucketForReward` presence + sums
  // `expectedTotal`; map pieces are validated by their own WORLD_TARGETS count, not that spread-
  // currency check (they have no expectedTotal), so exposing bucketForReward here would
  // double-count them (325 vs 294). Harvest still works — it just flows via reachabilitySupport.
  demandFor: bucket => {
    const tombId = bucket.slice(BUCKET_PREFIX.length)
    const tomb = TOMB_JOURNEYS.find(j => j.id === tombId)
    const real = REAL_JOURNEYS.find(rj => rj.id === tombId)
    const tier = (tomb?.tier ?? "starter") as Tier
    const totalRequired = real?.type === "treasure_tomb" ? real.piecesRequired : 0
    return { bucket, instanceId: tombId, tier, preferredWardKeys: [], required: totalRequired, totalRequired }
  },
  // Prefer a slot explicitly tagged for this tomb's map piece (the pyramid's authored map-piece
  // branch); among those (or, failing that, any tier-matched slot), spread across journeys first —
  // relaxing to a different pyramid within an already-used journey only once every journey in the
  // tier already holds an instance.
  rank: (candidates, demand) => {
    const byPoolScore = rankBy<Slot>(s => {
      const tierMatch = s.tier === demand.tier ? 1 : 0
      // Exact (`mapPiece:<tombId>`) or any-map-piece (bare `mapPiece`) preference boosts.
      const prefMatch = s.preference === demand.bucket || s.preference === CURRENCY_ID ? 1 : 0
      return tierMatch + prefMatch
    })
    return pipe<Slot>(
      preferThenRelax(
        pipe(
          byPoolScore,
          uniqueBy(s => s.journeyId)
        ),
        preferThenRelax(
          pipe(
            byPoolScore,
            uniqueBy(s => `${s.journeyId}:${s.ref.levelIndex}`)
          ),
          byPoolScore
        )
      )
    )(candidates)
  },
}
