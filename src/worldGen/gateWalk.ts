import { identitiesOf } from "./rewardIdentity"
import type { JourneyDef, SiteConfig, Tier, TombJourneyDef, TreasureReward } from "./types"
import type { ResolveEncounter, ResolveKeyRequirements } from "../game/siteAssembler"
import {
  computeReachability,
  createFloorAssemblyCache,
  deriveOwnedFacts,
  unmetTierGroups,
  type FloorAssemblyCache,
  type JourneyMeta,
  type OwnedCounts,
  type ReachabilitySupport,
} from "./reachability"
import { keyRewardsOf } from "./grounds"

// THE GATE WALK: what lies before a gate. "Before a gate" is the ground a player reaches from empty
// hands with that gate's fact never held: every key, map piece and ladder treasure in reach is picked
// up (a shop's stock counts as held the moment its shop is reached), world-wide, in the strict bracket
// (an authored door needs its key), and the walk settles to its fixed point. A hidden section is a gate too:
// its cells are in the ground only once the support's hidden requirement is held (a reward reached in the
// ground may grant it), and withholding that fact keeps every hidden pocket out.
//
// The walk never decides money. It lists every reward standing in the ground — room rewards and shop
// stock alike, the withheld fact's own reward included — and a mod counts its own kind in there:
// income against the price of what is buyable, which is the economy guard's question.
//
// `holding` is the walk a player stands in who has bought only some of what is for sale: shop stock counts as held
// only when it is one of the pieces bought, and the stock of every reached shop is listed apart. Grounds (grounds.ts)
// are enumerated on it.
//
// Core names no currency: the withheld fact is an opaque bucket string, and which reward feeds which
// bucket is the injected support's answer.

export type GateWalkResult = {
  /** Every reward standing in the reached ground, room rewards and shop stock alike. */
  rewards: readonly TreasureReward[]
  unlockedTiers: ReadonlySet<Tier>
  enteredJourneys: ReadonlySet<string>
  /** The walked sites whose way out the walk never reaches, as `<journey> level <n>`. */
  sitesNeverLeft: readonly string[]
  /** The locks the reached ground still runs into. */
  blocking: ReadonlySet<string>
  /** Where each blocking lock stands: `<journey> level <n> floor <f>`, or `<journey> entrance`. */
  blockingAt: ReadonlyMap<string, readonly string[]>
  /** For each tier of the world still locked, the groups of buckets none of which is held. */
  lockedTierNeeds: ReadonlyMap<Tier, readonly (readonly string[])[]>
}

/** The ground reached with only the bought pieces of shop stock held. */
export type HoldingResult = GateWalkResult & {
  /** Every piece of stock in the reached shops, bought or not; `rewards` lists the rooms' own rewards only. */
  stock: readonly TreasureReward[]
  /**
   * What the walk holds, as a key: its counts, each capped at the most any lock of the world asks of its bucket, plus
   * each bought piece feeding other than exactly one bucket by itself. Two results with equal keys and equal rewards and
   * stock walk on alike whatever is bought next: pieces feeding one bucket are interchangeable by count.
   */
  heldKey: string
}

/** The ground reached with `withheld` never held; with nothing withheld, the whole world as the strict walk sees it. */
export type GateWalk = ((withheld?: string) => GateWalkResult) & {
  /** The ground reached with only `bought` of all shop stock held (by identity). */
  holding: (bought: ReadonlySet<TreasureReward>) => HoldingResult
  /** Whether a reward is a key: its bucket is one some lock of the world names (grounds.ts, `keyRewardsOf`). */
  isKey: (reward: TreasureReward) => boolean
}

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
  const holdings = new Map<string, HoldingResult>()

  const walk = (
    withheld: string | undefined,
    stockHeld?: (reward: TreasureReward) => boolean
  ): GateWalkResult & { stock: readonly TreasureReward[]; owned: OwnedCounts } => {
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
        withheld,
        { stockHeld }
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
    const facts = deriveOwnedFacts(owned, support)
    if (withheld !== undefined) facts.delete(withheld)
    const lockedTiers = new Set(
      Object.values(journeyMeta)
        .map(meta => meta.tier)
        .filter(tier => !reach.unlockedTiers.has(tier))
    )
    return {
      rewards: reach.reachableRewards,
      unlockedTiers: reach.unlockedTiers,
      enteredJourneys: reach.enteredJourneys,
      sitesNeverLeft: reach.sitesNeverLeft,
      blocking: reach.discoveredLocks,
      blockingAt: reach.discoveredAt,
      lockedTierNeeds: new Map([...lockedTiers].map(tier => [tier, unmetTierGroups(tier, facts, support)])),
      stock: reach.reachableStock,
      owned,
    }
  }

  // The most any lock asks of a bucket: its own threshold, or a journey entry lock's. A bucket that stands for further
  // facts by its count (a pot of levers) is never capped.
  const capOf = (bucket: string): number => {
    if ((support.factsForCount?.(bucket, 1) ?? []).length > 0) return Infinity
    const entry = Object.keys(journeyMeta).flatMap(journeyId =>
      (support.journeyEntryLocks?.(journeyId) ?? []).filter(lock => lock.bucket === bucket).map(lock => lock.threshold)
    )
    return Math.max(support.thresholdFor?.(bucket) ?? 1, ...entry)
  }

  const harvestOf = (reward: TreasureReward): string[] => [
    ...[support.bucketForReward?.(reward)].filter((bucket): bucket is string => bucket !== undefined),
    ...(support.alsoHarvests?.(reward) ?? []),
  ]

  let isKey: ((reward: TreasureReward) => boolean) | undefined

  return Object.assign(
    (withheld?: string): GateWalkResult => {
      const known = walks.get(withheld)
      if (known) return known
      const { stock: _stock, owned: _owned, ...result } = walk(withheld)
      walks.set(withheld, result)
      return result
    },
    {
      holding: (bought: ReadonlySet<TreasureReward>): HoldingResult => {
        // A bought set is remembered by the identity of its pieces.
        const key = identitiesOf(bought).join(",")
        const known = holdings.get(key)
        if (known) return known
        const { owned, ...result } = walk(undefined, reward => bought.has(reward))
        const counts = [...owned].map(([bucket, count]) => `${bucket}=${Math.min(count, capOf(bucket))}`).sort()
        const apart = identitiesOf([...bought].filter(piece => harvestOf(piece).length !== 1))
        const holding = { ...result, heldKey: `${counts.join(",")}|${apart.join(",")}` }
        holdings.set(key, holding)
        return holding
      },
      isKey: (reward: TreasureReward): boolean =>
        (isKey ??= keyRewardsOf(configs, support, { resolveRequirements, resolveEncounter, cache }))(reward),
    }
  )
}
