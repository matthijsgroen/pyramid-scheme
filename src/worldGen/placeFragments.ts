import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import {
  computeReachability,
  createFloorAssemblyCache,
  deriveOwnedFacts,
  floorKey,
  type JourneyMeta,
  type ReachabilitySupport,
} from "./reachability"
import { collectSlots, type Slot, type FamilyPriorityFor } from "./slots"
import { allocateDistributions, cappedToDistribution, type Distribution } from "./slotAllocator"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"

// Worklist-driven, reachability-gated currency placement — the concrete engine this
// backlog item's solver was built for. See docs/game-design/keys-and-locks-solver.md,
// "The placement algorithm" / "Structure, then loot". A real queue: seeded from whatever's
// discovered blocking right now, grown as each placement unblocks further reachability and
// reveals new locks — never a precomputed, exhaustive demand list. This module owns none of
// the "which currency, how many, which candidates score higher" knowledge — that's mod-owned
// (docs/mods/ARCHITECTURE.md, "Currencies are mod-owned, not a closed core vocabulary"),
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
  // The gate threshold for one of this currency's buckets: how many held instances satisfy a
  // lock on it (e.g. a hieroglyph needing N fragments). Injected into reachability so core
  // gates on "held ≥ what the registered currency says," naming no specific currency. Core's
  // own currencies (map pieces via a journey's piecesRequired) are handled by reachability
  // directly and need not implement this.
  thresholdFor?: (bucket: string) => number
  // Maps one of this currency's harvestable rewards to the bucket it counts toward (e.g. a
  // hieroglyph-fragment reward → `hieroglyph:<id>`). Returns undefined for rewards this
  // currency doesn't own. Injected into reachability's harvest so core reads "which bucket
  // does this reward feed" without naming the reward type.
  bucketForReward?: (reward: TreasureReward) => string | undefined
  // How many instances of this currency the finished world must contain — the mod's own
  // number (docs/mods/TARGET.md rule 2). Summed across registered currencies into the build's
  // reward-count check; a currency that leaves the registry drops its expectation with it, so
  // toggle-off never trips a false "expected N, got 0". Omit for core currencies validated
  // their own way (map pieces vs WORLD_TARGETS).
  expectedTotal?: () => number
  // Every bucket id this currency is ultimately responsible for placing (e.g. every
  // `hieroglyph:<id>` the world's tableaus reference), independent of whether the reachability
  // walk ever discovers a lock on it. The worklist is discovery-driven by design (see the module
  // doc above) — a bucket nothing ever locks on is never enqueued, so a symbol no reachable
  // tableau happens to reference would otherwise silently never get placed. This is the
  // completion-pass source of truth that catches that: after the discovery-driven drain settles,
  // every one of these not yet satisfied is enqueued and drained too. Omit for currencies where
  // "never discovered" genuinely means "never needed" (map pieces — a tomb's piece count is
  // itself discovered via the tomb's own journey-entry lock).
  allBuckets?: () => readonly string[]
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

// A capped-filler currency — a fixed total spread across loot nodes that NEVER gates progress
// (mosaic pieces). Unlike CurrencyDistribution it's not discovered via the reachability
// worklist (nothing blocks on it); it's placed by the phase-3 pass below once the lock queue
// drains. Smaller shape: no ownsBucket/demandFor, just "how many, which reward, in what order".
// Mod-owned and injected the same way CurrencyDistribution is — this module never imports mods.
export type CappedCurrency = {
  bucket: string
  toReward: () => TreasureReward
  // World-wide count to place, net of any pre-authored literals (compute from allConfigs if a
  // currency has some; mosaic has none — every instance flows through the slot pool).
  totalRequired: (allConfigs: Record<string, SiteConfig[]>) => number
  // Which slots this currency may take at all (default: any loot node the phase-3 pass offers).
  // A hard filter, unlike `rank` — e.g. mosaic's per-register pools only take their own tier.
  eligible?: (slot: Slot) => boolean
  // Order the still-available slots best-first for this currency (e.g. prefer `prefers`-tagged).
  rank: (candidates: readonly Slot[]) => Slot[]
}

// Each journey carries only its tier — whether entering it needs a currency threshold (a tomb's
// map pieces) is the injected `reachabilitySupport.journeyEntryLock`'s data, so core names no
// currency and reads no per-tomb count here.
const buildJourneyMeta = (): Record<string, JourneyMeta> => {
  const meta: Record<string, JourneyMeta> = {}
  for (const j of PYRAMID_JOURNEYS) meta[j.id] = { tier: j.tier }
  for (const j of TOMB_JOURNEYS) meta[j.id] = { tier: j.tier }
  return meta
}

// Mutates allConfigs in place: places gating currencies (reachability worklist) then capped
// currencies (allocator) into path-end slots, then hands every remaining slot to the dynamic-loot
// distributions (allocateDistributions — the mod-owned money/junk/consumable Distributions).
// Throws (does not warn) if a demand has no reachable slot once every relaxation rung is exhausted
// — docs/game-design/keys-and-locks-solver.md, "Exhausted relaxation is a build failure, not a warning".
export const placeFragments = (
  allConfigs: Record<string, SiteConfig[]>,
  currencies: readonly CurrencyDistribution[],
  resolveRequirements?: ResolveKeyRequirements,
  capped: readonly CappedCurrency[] = [],
  dynamicDistributions: readonly Distribution[] = [],
  familyPriorityFor?: FamilyPriorityFor,
  emptyFraction = 0,
  reachabilitySupport: ReachabilitySupport = {}
): void => {
  const slots = collectSlots(allConfigs, familyPriorityFor)
  const available = new Set(slots)
  const journeyMeta = buildJourneyMeta()

  const ownedCounts = new Map<string, number>()
  // One cache for this whole placement run — grid topology never changes as ownedCounts
  // grows, only which gates are unlocked does (see reachability.ts's FloorAssemblyCache),
  // so every one of this loop's many computeReachability calls reuses the same assembled
  // grids instead of re-running maze generation for every reachable floor every time.
  const assemblyCache = createFloorAssemblyCache()
  // Currency knowledge reachability needs but must not import (it's mod-agnostic): each
  // registered currency supplies its own gate threshold + reward→bucket harvest, merged with the
  // mod-injected `reachabilitySupport` (the tomb-treasure mod's tomb-key harvest, the tomb
  // journey-entry lock, and the tier-unlock ladder). Built here, where the injected `currencies`
  // + support are in scope, and threaded into every reachability call. Core names no currency.
  const support: ReachabilitySupport = {
    thresholdFor: (bucket: string) =>
      currencies.find(c => c.ownsBucket(bucket))?.thresholdFor?.(bucket) ?? reachabilitySupport.thresholdFor?.(bucket),
    bucketForReward: (reward: TreasureReward) => {
      for (const c of currencies) {
        const b = c.bucketForReward?.(reward)
        if (b) return b
      }
      return reachabilitySupport.bucketForReward?.(reward)
    },
    journeyEntryLock: reachabilitySupport.journeyEntryLock,
    tierUnlockBucket: reachabilitySupport.tierUnlockBucket,
  }
  const computeReach = () =>
    computeReachability(allConfigs, journeyMeta, ownedCounts, resolveRequirements, assemblyCache, support)

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

  // Drains `queue` to empty, placing each bucket's demand and growing the queue as newly
  // reachable frontier reveals further locks (enqueueNewLocks) or harvests new facts
  // (settleHarvest). Called twice: once for the discovery-driven walk below, once more for
  // the completion pass after it (see `allBuckets` on CurrencyDistribution) — a second call
  // is a no-op if the first one already discovered and placed everything, which today it does.
  const drain = (): void => {
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
        // A shop stock slot's preference is a HARD claim (deliberate authored stock), unlike a
        // free-world slot's soft preference: this currency may fill a fez-shop slot only if it owns
        // that slot's tagged bucket — so the gating worklist can't spill e.g. a hieroglyph into a
        // mosaic shop slot. Non-shop slots stay soft (any currency, any node).
        // Hidden slots are excluded outright: a hidden corridor is a discovery-gated OPTIONAL pocket
        // (keys-and-locks-solver.md §E / collection-and-detector-design.md §7.3), structurally
        // reachable but never guaranteed reachable (needs the corridor detector or a lucky stumble),
        // so a progression-gating currency the solver must guarantee may never land there. They stay
        // available for the capped/dynamic filler passes below — optional loot is exactly their role.
        //
        // A slot's own tomb-key gates (`wardKeys`) must ALL be held right now, too. `reachableFloors`
        // is floor-granular — it says the floor's entrance is reachable, not that a key-gated pocket
        // WITHIN it is. Without this, a required fragment can land behind a tomb-key the worklist
        // hasn't earned yet — worst case the SAME floor's own tableau reward (a tableau needing this
        // very hieroglyph), a self-referential lock that caps the hieroglyph one fragment short
        // forever. The doc's contract is explicit (keys-and-locks-solver.md: "a key is never placed
        // outside the reachable area"; "place ward key → pocket reachable → THEN place the required
        // piece") — a harvested tomb-key sits in ownedFacts, so once earned the pocket opens legitly.
        const ownedFacts = deriveOwnedFacts(ownedCounts, support)
        const eligible = (s: Slot) =>
          s.kind === "end" &&
          !s.hidden &&
          available.has(s) &&
          reach.reachableFloors.has(floorKey(s.ref)) &&
          s.wardKeys.every(k => ownedFacts.has(k)) &&
          (s.encounter !== "fez-shop" || s.preference === undefined || currency.ownsBucket(s.preference))
        // Soft-avoid slots an author tagged for a FILLER bucket — one no gating currency claims, i.e.
        // capped filler (`end: "mosaic"`) or a dynamic distribution's (`end: "junk"`). A gating
        // currency uses them only after untagged slots run out, so an authored filler reservation
        // survives whenever there's slack — without it, gating front-loads its pieces into the
        // earliest reachable slots and starves an early tier of its reachable filler loot (a starter
        // mosaic unreachable until the master-tier detector; a starter tier whose junk corridors all
        // end up holding fragments instead, leaving its collectibles stacked on one floor).
        //
        // Tags belonging to ANOTHER GATING currency are deliberately NOT avoided: those compete on
        // the worklist's own terms, and holding back from them breaks the hieroglyph holdback
        // guarantee (fragmentHoldback.spec.ts). Filler can't compete — it runs after — so only it
        // needs the reservation. Stable sort keeps the currency's own rank order within each group;
        // still falls back to a tagged slot if that's all that's reachable, so placement never fails
        // where it otherwise would.
        const reservedForFiller = (s: Slot) =>
          s.preference !== undefined && !currencies.some(c => c.ownsBucket(s.preference!)) ? 1 : 0
        const ranked = [...currency.rank(slots.filter(eligible), demand)].sort(
          (a, b) => reservedForFiller(a) - reservedForFiller(b)
        )

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
  }

  drain()

  // Completion pass (keys-and-locks-solver.md, "Discovery-driven, with a completion backstop"):
  // the discovery-driven drain above never enqueues a bucket nothing ever locked on. Most of the
  // time that's every bucket — a tableau's own requirement is itself the lock. But it's not a
  // logical guarantee, so enqueue whatever each currency says it's ultimately responsible for
  // (`allBuckets`) and drain again. By construction this only ever adds placements (a bucket
  // already `satisfied` is skipped), so it can only move the world TOWARD full coverage, never
  // away from it — and it's the reason `allBuckets` must return every id a currency's own
  // `expectedTotal` counts, so the two agree by construction instead of by luck.
  for (const currency of currencies) {
    for (const bucket of currency.allBuckets?.() ?? []) {
      if (satisfied.has(bucket) || queued.has(bucket)) continue
      queue.push(bucket)
      queued.add(bucket)
    }
  }
  drain()

  // Winnability guard (keys-and-locks-solver.md, "nothing can progress = hard-fail"): once the
  // worklist drains, no lock the walk discovered may still be blocking. A remaining lock means
  // no registered currency owns it — e.g. a gating mod was toggled off but its gate is still
  // authored — which is a soft-locked, unwinnable world. The per-placement throw above only
  // catches a claimed-but-unplaceable currency; an unclaimed bucket slips past it via the
  // `continue`, so this final sweep is what actually enforces the "reach Wizard" invariant for a
  // gating currency's toggle-off. (Construction-time ward/tomb keys resolve via settleHarvest and
  // are already satisfied here, so they don't trip it.)
  if (reach.discoveredLocks.size > 0) {
    const stuck = [...reach.discoveredLocks].join(", ")
    throw new Error(
      `placeFragments: world not fully solvable — lock(s) still blocking after placement: ${stuck}. ` +
        `No registered currency owns them (a gating mod toggled off with its gate still authored?), ` +
        `or a required key sits behind the gate it opens.`
    )
  }

  // A slot an author tagged for a gating currency (e.g. `endReward: "hieroglyph"`), if that
  // currency's own demand never claimed it, gracefully falls back to a top-priority capped-currency
  // candidate instead of competing purely on collection order in Phase 3 below — an author's
  // placement intent shouldn't evaporate just because the gating currency this slot preferred
  // didn't end up needing it. Every gating currency's demand is fully satisfied by this point (the
  // loop above only exits once its queue drains), so any leftover gating-owned preference here is
  // unclaimed for good.
  for (const slot of available) {
    if (slot.preference && currencies.some(c => c.ownsBucket(slot.preference!))) {
      // The first capped currency that would actually take this slot — handing a wizard node to a
      // starter-only pool would strand it, since a capped `eligible` is a hard filter.
      const taker = capped.find(c => c.eligible?.(slot) ?? true)
      if (taker) slot.preference = taker.bucket
    }
  }

  // Phase 3: capped-filler currencies (e.g. mosaic pieces). These never gate progress, so
  // they're not on the worklist above — placed only once every lock has been resolved, into
  // whatever slots the gating currencies left free, via the unified slot allocator: each is an
  // exact-footprint Distribution (spread across still-available slots in its own rank order, up
  // to its total), which HARD-FAILS if short — capped loot must fully place (keys-and-locks-
  // solver.md, "Exhausted relaxation is a build failure"). A shortfall means author more loot-
  // bearing capacity in the DSL (docs/mods/TARGET.md rule 2). Money/junk/consumables join this
  // allocator as flexible-footprint distributions in later steps (distribution-primitive-design.md).
  allocateDistributions(available, capped.map(cappedToDistribution), allConfigs)

  // Phase 5: dynamic loot — the mod-owned distributions (trap consumables, shop money economy)
  // claim priority-ordered eligible slots (chest 100 before puzzle 60) and fill them themselves;
  // `emptyFraction` reserves a share empty up front so found loot stays meaningful. Each drops
  // with its mod (shop off → no money/junk; trap off → no consumables). See slotAllocator.ts +
  // docs/mods/distribution-primitive-design.md.
  allocateDistributions(available, dynamicDistributions, allConfigs, emptyFraction)

  // Every slot no distribution claimed (reserved-empty, weight-0, or budget left over) is an empty
  // path end — clear the fragmentSlot sentinels so none reaches the serializer.
  for (const slot of available) slot.assign(undefined)
  available.clear()
}
