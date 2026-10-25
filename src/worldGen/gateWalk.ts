import type { JourneyDef, SiteConfig, Tier, TombJourneyDef, TreasureReward } from "./types"
import type { ResolveEncounter, ResolveKeyRequirements } from "../game/siteAssembler"
import {
  computeReachability,
  createFloorAssemblyCache,
  type FloorAssemblyCache,
  type JourneyMeta,
  type ReachabilitySupport,
} from "./reachability"

// THE GATE WALK: what lies before a gate. "Before a gate" is the ground a player reaches from empty
// hands with that gate's fact never held: every key, map piece and ladder treasure in reach is picked
// up (a shop's stock counts as held the moment its shop is reached), world-wide, in the strict bracket
// (an authored door needs its key), and the walk settles to its fixed point. Hidden pockets in that
// ground count: they are reachable, only not guaranteed found.
//
// The walk never decides money. It lists every reward standing in the ground — room rewards and shop
// stock alike, the withheld fact's own reward included — and a mod counts its own kind in there:
// income against the price of what is buyable, which is the economy guard's question.
//
// Core names no currency: the withheld fact is an opaque bucket string, and which reward feeds which
// bucket is the injected support's answer.

export type GateWalkResult = {
  /** Every reward standing in the reached ground, room rewards and shop stock alike. */
  rewards: readonly TreasureReward[]
  unlockedTiers: ReadonlySet<Tier>
  enteredJourneys: ReadonlySet<string>
  /** The locks the reached ground still runs into. */
  blocking: ReadonlySet<string>
}

/** The ground reached with `withheld` never held; with nothing withheld, the whole world as the strict walk sees it. */
export type GateWalk = (withheld?: string) => GateWalkResult

export type GateWalkOptions = {
  configs: Record<string, SiteConfig[]>
  journeyMeta: Record<string, JourneyMeta>
  support: ReachabilitySupport
  resolveRequirements?: ResolveKeyRequirements
  resolveEncounter?: ResolveEncounter
  /** Assembled grids of the finished world; a cache holding grids from before the loot was placed lists stale rewards. */
  cache?: FloorAssemblyCache
}

/** Each journey's tier, which is all the walk reads of a journey besides its sites. */
export const journeyMetaFor = (
  pyramids: readonly JourneyDef[],
  tombs: readonly TombJourneyDef[]
): Record<string, JourneyMeta> =>
  Object.fromEntries([...pyramids, ...tombs].map(journey => [journey.id, { tier: journey.tier }]))

export const makeGateWalk = ({
  configs,
  journeyMeta,
  support,
  resolveRequirements,
  resolveEncounter,
  cache = createFloorAssemblyCache(),
}: GateWalkOptions): GateWalk => {
  const walks = new Map<string | undefined, GateWalkResult>()

  const walk = (withheld: string | undefined): GateWalkResult => {
    // Fresh counts every call: a walk never inherits what another walk held.
    const owned = new Map<string, number>()
    const reachWith = () =>
      computeReachability(
        configs,
        journeyMeta,
        owned,
        resolveRequirements,
        cache,
        support,
        resolveEncounter,
        false,
        withheld
      )
    let reach = reachWith()
    for (;;) {
      let grew = false
      for (const [bucket, count] of reach.harvestedCounts) {
        if (bucket === withheld || (owned.get(bucket) ?? 0) >= count) continue
        owned.set(bucket, count)
        grew = true
      }
      if (!grew) break
      reach = reachWith()
    }
    return {
      rewards: reach.reachableRewards,
      unlockedTiers: reach.unlockedTiers,
      enteredJourneys: reach.enteredJourneys,
      blocking: reach.discoveredLocks,
    }
  }

  return withheld => {
    const known = walks.get(withheld)
    if (known) return known
    const result = walk(withheld)
    walks.set(withheld, result)
    return result
  }
}
