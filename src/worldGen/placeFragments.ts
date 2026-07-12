import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import { computeReachability, createFloorAssemblyCache, floorKey, type JourneyMeta } from "./reachability"
import { collectSlots, type Slot } from "./slots"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { journeys as REAL_JOURNEYS } from "../data/journeys"
import { sellablesForDifficulty } from "../data/sellables"
import { hashStr } from "./rewards"

// Worklist-driven, reachability-gated currency placement — the concrete engine this
// backlog item's solver was built for. See docs/game-design/keys-and-locks-solver.md,
// "The placement algorithm" / "Structure, then loot". A real queue: seeded from whatever's
// discovered blocking right now, grown as each placement unblocks further reachability and
// reveals new locks — never a precomputed, exhaustive demand list. This module owns none of
// the "which currency, how many, which candidates score higher" knowledge — that's mod-owned
// (docs/mods-architecture.md, "Currencies are mod-owned, not a closed core vocabulary"),
// injected as CurrencyDistribution values by whoever has access to the real mod registry
// (src/mods/allCurrencyDistributions.ts, consumed by scripts/generateWorld.ts) — this module
// never imports src/mods/ directly.

export type CurrencyDemand = {
  bucket: string
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
  // Does this currency own the given OwnedCounts bucket id (e.g. a `hieroglyph:` prefix)?
  // Checked against every lock the worklist discovers — whichever currency claims it then
  // computes its own demand lazily (demandFor), never enumerated upfront.
  ownsBucket: (bucket: string) => boolean
  toReward: (instanceId: string) => TreasureReward
  // Computes one bucket's demand lazily, only once the worklist has actually discovered it
  // blocking somewhere reachable — see keys-and-locks-solver.md, "Structure, then loot".
  demandFor: (bucket: string, allConfigs: Record<string, SiteConfig[]>) => CurrencyDemand
  // This currency's own distribution rule: order `candidates` best-first (composed from
  // src/worldGen/distribution.ts's pipe/filterBy/rankBy/preferThenRelax primitives) — e.g.
  // hieroglyphs rank tier/ward-match then dedup by journey; map pieces dedup by journey then
  // relax to pyramid. placeFragments only ever hands over already reachable-and-available
  // candidates; ordering them is entirely this currency's own policy, never this module's.
  rank: (candidates: readonly Slot[], demand: CurrencyDemand) => Slot[]
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

  let reach = computeReach()

  // Grow ownedCounts with freshly-harvested map-piece/hieroglyph facts until nothing new
  // shows up — nothing here is CHOSEN by this solver (pre-authored rewards are pre-baked at
  // build time); this is purely discovering what's already reachable given what's already
  // been placed, the same fixed point computeReachability's own harvest exists to feed.
  const settleHarvest = (): void => {
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
  settleHarvest()

  // The real worklist queue (keys-and-locks-solver.md, "The placement algorithm"): seeded
  // from whatever's discovered blocking right now, grown after every placement as newly
  // reachable frontier reveals further locks. `queued` prevents duplicate enqueue; `satisfied`
  // prevents re-processing a bucket a later recompute still (harmlessly) reports as discovered.
  const queue: string[] = [...reach.discoveredLocks]
  const queued = new Set(queue)
  const satisfied = new Set<string>()

  const enqueueNewLocks = (): void => {
    for (const id of reach.discoveredLocks) {
      if (satisfied.has(id) || queued.has(id)) continue
      queue.push(id)
      queued.add(id)
    }
  }

  while (queue.length > 0) {
    const bucket = queue.shift()!
    queued.delete(bucket)
    if (satisfied.has(bucket)) continue

    // Nobody claims this bucket (e.g. a ward-key/tombKey gate resolved by siteAssembler's
    // own construction-time key chain, not a currency this module places) — leave it; it
    // either resolves itself via harvestedCounts once the right site becomes reachable, or
    // it's a gate the fine-grained validator's own checks are responsible for catching.
    const currency = currencies.find(c => c.ownsBucket(bucket))
    if (!currency) continue

    const demand = currency.demandFor(bucket, allConfigs)
    let needed = demand.required

    if (needed > 0) {
      const eligible = (s: Slot) => available.has(s) && reach.reachableFloors.has(floorKey(s.ref))
      const ranked = currency.rank(slots.filter(eligible), demand)

      for (const slot of ranked) {
        if (needed <= 0) break
        slot.assign(currency.toReward(demand.instanceId))
        available.delete(slot)
        needed--
      }

      if (needed > 0) {
        throw new Error(
          `placeFragments: ${demand.instanceId} (${bucket}) unplaceable — ${needed} instance(s) with no reachable slot`
        )
      }
    }

    satisfied.add(bucket)
    ownedCounts.set(bucket, demand.totalRequired)
    reach = computeReach()
    settleHarvest()
    enqueueNewLocks()
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
