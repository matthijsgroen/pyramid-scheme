import type { SiteConfig, Tier } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import {
  computeReachability,
  createFloorAssemblyCache,
  floorKey,
  hieroglyphBucket,
  type JourneyMeta,
} from "./reachability"
import { collectSlots, type Slot } from "./slots"
import { pipe, filterBy, uniqueBy, rankBy, preferThenRelax } from "./distribution"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { tableauLevels } from "../data/tableaus"
import { journeys as REAL_JOURNEYS } from "../data/journeys"
import { sellablesForDifficulty } from "../data/sellables"
import { hashStr } from "./rewards"

// Worklist-driven hieroglyph-fragment placement — the concrete currency this backlog item's
// solver was built for. See docs/game-design/keys-and-locks-solver.md, "The placement
// algorithm": place a hieroglyph's fragments only into slots inside the currently reachable
// area, recompute reachability once its requirement is satisfied (that may open further
// floors/tableaus), repeat. Replaces fragments.ts's own tier/ward-tag heuristic, which never
// checked real computed reachability at all.

const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

type HieroglyphInfo = { hieroglyphId: string; tier: Tier; preferredWardKeys: string[]; required: number }

// For each hieroglyph: which tier it belongs to, how many fragments it needs, and which ward
// keys (earned by completing earlier tomb runs) its preferred placement slots sit behind.
// Ported from fragments.ts's buildPlacementInfos — this is the currency's OWN authored
// preference (per the doc's step 2a), layered as a ranking on top of the reachability filter.
const buildHieroglyphInfos = (): HieroglyphInfo[] => {
  const infos: HieroglyphInfo[] = []
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

      infos.push({ hieroglyphId, tier, preferredWardKeys, required: HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2 })
    }
  }

  return infos
}

// hieroglyphFragment rewards already authored directly (bypassing fragmentSlot entirely —
// e.g. a Fez-shop stock literal) — subtracted from each hieroglyph's `required` so the
// world-wide total stays exactly EXPECTED_HIEROGLYPH_FRAGMENTS regardless of how many were
// placed this way.
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

// Mutates allConfigs in place: assigns hieroglyphFragment rewards to fragmentSlot sentinels
// and open ward gates, then fills any remaining placeholder slots with consumables. Throws
// (does not warn) if a hieroglyph has no reachable slot once every relaxation rung is
// exhausted — docs/game-design/keys-and-locks-solver.md, "Exhausted relaxation is a build
// failure, not a warning".
export const placeFragments = (
  allConfigs: Record<string, SiteConfig[]>,
  resolveRequirements?: ResolveKeyRequirements
): void => {
  const slots = collectSlots(allConfigs)
  const available = new Set(slots)
  const journeyMeta = buildJourneyMeta()
  const infos = buildHieroglyphInfos()
  const existing = countExistingFragments(allConfigs)

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

  for (const info of infos) {
    let needed = info.required - (existing.get(info.hieroglyphId) ?? 0)
    if (needed <= 0) continue

    const eligible = (s: Slot) => available.has(s) && reach.reachableFloors.has(floorKey(s.ref))
    // Pool priority (tier+preferred-ward > tier-only > cross-tier) as a rank score, not
    // fragments.ts's separate sequential pools — the doc's own composable-rule shape
    // (`pipe(filterBy(...), rankBy(...))`). Ranked BEFORE deduping by journey, so the
    // "one per journey" strict pass keeps each journey's best-scoring slot, not an
    // arbitrary one.
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
      slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
      available.delete(slot)
      needed--
    }

    if (needed > 0) {
      throw new Error(
        `placeFragments: ${info.hieroglyphId} (${info.tier}) unplaceable — ${needed} fragment(s) with no reachable slot`
      )
    }

    ownedCounts.set(hieroglyphBucket(info.hieroglyphId), info.required)
    reach = computeReach()
    settle()
  }

  // Fill every remaining slot with junk loot — both fragmentSlot placeholders and open
  // ward-gate slots that no fragment reached. Tiered by the slot's own journey tier.
  let fallbackIdx = 0
  for (const slot of available) {
    const items = sellablesForDifficulty(slot.tier as Difficulty)
    const item = items[hashStr(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`) % items.length]
    slot.assign({ type: "sellable", itemId: item.id })
  }
}
