import type { SiteConfig, Tier } from "./types"
import type { CurrencyDistribution } from "./placeFragments"
import type { Slot } from "./slots"
import { pipe, rankBy, uniqueBy, preferThenRelax } from "./distribution"
import { TOMB_JOURNEYS } from "./data"
import { journeys as REAL_JOURNEYS } from "../data/journeys"

// The map-piece currency — core world-gen's own progression currency (not a mod plugin like
// hieroglyph fragments; every tomb needs one, regardless of which mods are registered). See
// docs/game-design/keys-and-locks-solver.md, "Map piece placement": a two-level diversity
// ladder (spread across journeys first, relax to a different pyramid within an already-used
// journey), not a single dedup level.

const BUCKET_PREFIX = "mapPiece:"

// mapPiece rewards already authored directly as a literal (bypassing the preference-tagged
// fragmentSlot sentinel entirely) — subtracted from the required count so the world-wide
// total stays exactly right regardless of how many were placed this way.
const countExisting = (allConfigs: Record<string, SiteConfig[]>, tombId: string): number => {
  let count = 0
  const bump = (r?: { type: string; tombId?: string }) => {
    if (r?.type === "mapPiece" && r.tombId === tombId) count++
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

export const MAP_PIECE_CURRENCY: CurrencyDistribution = {
  ownsBucket: bucket => bucket.startsWith(BUCKET_PREFIX),
  toReward: tombId => ({ type: "mapPiece", tombId }),
  demandFor: (bucket, allConfigs) => {
    const tombId = bucket.slice(BUCKET_PREFIX.length)
    const tomb = TOMB_JOURNEYS.find(j => j.id === tombId)
    const real = REAL_JOURNEYS.find(rj => rj.id === tombId)
    const tier = (tomb?.tier ?? "starter") as Tier
    const totalRequired = real?.type === "treasure_tomb" ? real.piecesRequired : 0
    const required = totalRequired - countExisting(allConfigs, tombId)
    return { bucket, instanceId: tombId, tier, preferredWardKeys: [], required, totalRequired }
  },
  // Prefer a slot explicitly tagged for this tomb's map piece (the DSL's "first pyramid of
  // this tier" convention); among those (or, failing that, any tier-matched slot), spread
  // across journeys first — relaxing to a different pyramid within an already-used journey
  // only once every journey in the tier already holds an instance.
  rank: (candidates, demand) => {
    const byPoolScore = rankBy<Slot>(s => {
      const tierMatch = s.tier === demand.tier ? 1 : 0
      const prefMatch = s.preference === demand.bucket ? 1 : 0
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
