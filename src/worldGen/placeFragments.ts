import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import { computeReachability, createFloorAssemblyCache, floorKey, type JourneyMeta } from "./reachability"
import { collectSlots, type Slot } from "./slots"
import { pipe, filterBy, uniqueBy, rankBy, preferThenRelax } from "./distribution"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { journeys as REAL_JOURNEYS } from "../data/journeys"
import { sellablesForDifficulty } from "../data/sellables"
import { hashStr } from "./rewards"

// Worklist-driven, reachability-gated currency placement — the concrete engine this
// backlog item's solver was built for. See docs/game-design/keys-and-locks-solver.md,
// "The placement algorithm". Generic over WHICH currency: place each currency's
// instances only into slots inside the currently reachable area, recompute reachability
// once a currency's requirement is satisfied (that may open further floors/tableaus),
// repeat. This module owns none of the "which currency, how many, which candidates score
// higher" knowledge — that's mod-owned (docs/mods-architecture.md, "Currencies are
// mod-owned, not a closed core vocabulary"), injected as CurrencyDistribution values by
// whoever has access to the real mod registry (src/mods/allCurrencyDistributions.ts,
// consumed by scripts/generateWorld.ts) — this module never imports src/mods/ directly.

export type CurrencyDemand = {
  instanceId: string
  tier: Tier
  preferredWardKeys: string[]
  // How many MORE instances the worklist must place — already net of anything
  // pre-authored directly (bypassing slots, e.g. a Fez-shop stock literal), so the
  // world-wide total placed-by-worklist + pre-authored stays exactly `totalRequired`.
  required: number
  // The RAW total this currency's own completion fact is thresholded against in
  // reachability.ts's OwnedCounts model (e.g. HIEROGLYPH_REQUIRED[id]) — NOT net of
  // pre-authored instances. `ownedCounts` must be set to this once satisfied, not to
  // `required`, or a currency with any pre-authored instances would be permanently
  // under-counted against its own threshold (reachability.ts's deriveOwnedFacts) even
  // though every instance — pre-authored + placed — genuinely exists.
  totalRequired: number
}

export type CurrencyDistribution = {
  // Bucket id this currency's completion fact lives under in reachability.ts's
  // OwnedCounts model (e.g. hieroglyphBucket) — how much of instanceId is needed before
  // the fact counts as owned is threshold logic reachability.ts already owns.
  bucket: (instanceId: string) => string
  toReward: (instanceId: string) => TreasureReward
  // Every instance this currency needs placed, with its own tier/ward preference.
  demands: (allConfigs: Record<string, SiteConfig[]>) => CurrencyDemand[]
}

// Pyramids have no map-piece threshold (0); tombs use their real `piecesRequired` from
// src/data/journeys.ts — the same value validateDiscovery/real gameplay already gate on, no
// special-casing for primary vs. secondary tombs needed (both resolve via the same
// reachability fixed point below, using their own real threshold).
const buildJourneyMeta = (): Record<string, JourneyMeta> => {
  const meta: Record<string, JourneyMeta> = {}
  for (const j of PYRAMID_JOURNEYS) meta[j.id] = { tier: j.tier, piecesRequired: 0 }
  for (const j of TOMB_JOURNEYS) {
    const real = REAL_JOURNEYS.find(rj => rj.id === j.id)
    meta[j.id] = { tier: j.tier, piecesRequired: real?.type === "treasure_tomb" ? real.piecesRequired : 0 }
  }
  return meta
}

// Mutates allConfigs in place: assigns each registered currency's rewards to fragmentSlot
// sentinels and open ward gates, then fills any remaining placeholder slots with
// consumables. Throws (does not warn) if a demand has no reachable slot once every
// relaxation rung is exhausted — docs/game-design/keys-and-locks-solver.md, "Exhausted
// relaxation is a build failure, not a warning".
export const placeFragments = (
  allConfigs: Record<string, SiteConfig[]>,
  currencies: readonly CurrencyDistribution[],
  resolveRequirements?: ResolveKeyRequirements
): void => {
  const slots = collectSlots(allConfigs)
  const available = new Set(slots)
  const journeyMeta = buildJourneyMeta()

  const ownedCounts = new Map<string, number>()
  // One cache for this whole placement run — grid topology never changes as ownedCounts
  // grows, only which gates are unlocked does (see reachability.ts's FloorAssemblyCache),
  // so every one of this loop's many computeReachability calls reuses the same assembled
  // grids instead of re-running maze generation for every reachable floor every time.
  const assemblyCache = createFloorAssemblyCache()
  const computeReach = () =>
    computeReachability(allConfigs, journeyMeta, ownedCounts, resolveRequirements, assemblyCache)

  // Grow ownedCounts with freshly-harvested map-piece/hieroglyph facts until nothing new
  // shows up — nothing here is CHOSEN by this solver (map-piece/tomb-key rewards are
  // pre-baked at build time); this is purely discovering what's already reachable given
  // what's already been placed, the same fixed point computeReachability's own harvest
  // exists to feed.
  let reach = computeReach()
  const settle = (): void => {
    for (;;) {
      let grew = false
      for (const [id, count] of reach.harvestedCounts) {
        if ((ownedCounts.get(id) ?? 0) < count) {
          ownedCounts.set(id, count)
          grew = true
        }
      }
      if (!grew) return
      reach = computeReach()
    }
  }
  settle()

  for (const currency of currencies) {
    for (const info of currency.demands(allConfigs)) {
      let needed = info.required
      if (needed <= 0) continue

      const eligible = (s: Slot) => available.has(s) && reach.reachableFloors.has(floorKey(s.ref))
      // Pool priority (tier+preferred-ward > tier-only > cross-tier) as a rank score —
      // the doc's own composable-rule shape (`pipe(filterBy(...), rankBy(...))`). Ranked
      // BEFORE deduping by journey, so the "one per journey" strict pass keeps each
      // journey's best-scoring slot, not an arbitrary one.
      const byPoolScore = rankBy<Slot>(s => {
        const tierMatch = s.tier === info.tier
        const wardMatch = info.preferredWardKeys.length > 0 && s.wardKeys.some(k => info.preferredWardKeys.includes(k))
        return (tierMatch ? 1 : 0) + (tierMatch && wardMatch ? 1 : 0)
      })
      const ranked = pipe<Slot>(
        filterBy(eligible),
        preferThenRelax(
          pipe(
            byPoolScore,
            uniqueBy(s => s.journeyId)
          ),
          byPoolScore
        )
      )(slots)

      for (const slot of ranked) {
        if (needed <= 0) break
        slot.assign(currency.toReward(info.instanceId))
        available.delete(slot)
        needed--
      }

      if (needed > 0) {
        throw new Error(
          `placeFragments: ${info.instanceId} (${info.tier}) unplaceable — ${needed} instance(s) with no reachable slot`
        )
      }

      ownedCounts.set(currency.bucket(info.instanceId), info.totalRequired)
      reach = computeReach()
      settle()
    }
  }

  // Fill every remaining slot with junk loot — both fragmentSlot placeholders and open
  // ward-gate slots that no currency reached. Tiered by the slot's own journey tier.
  let fallbackIdx = 0
  for (const slot of available) {
    const items = sellablesForDifficulty(slot.tier as Difficulty)
    const item = items[hashStr(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`) % items.length]
    slot.assign({ type: "sellable", itemId: item.id })
  }
}
