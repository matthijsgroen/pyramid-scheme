import type { SiteConfig, TreasureReward } from "./types"
import { identitiesOf } from "./rewardIdentity"
import type { GateWalk, HoldingResult } from "./gateWalk"
import { carveSiteFloor, TIER_LADDER, type FloorCarve, type ReachabilitySupport } from "./reachability"

// A GROUND is a place a player can stand in: the fixed point of the strict walk from empty hands, in which a piece of
// shop stock counts as held only once it is bought. Which ground a player stands in depends on which key pieces they
// bought, and in what order they could: a key piece is bought only from a shop the ground before it reaches.
//
// Every ground is listed, not one per gate. A check that withholds one gate at a time sees the ground before that gate
// with every other key held; a player who bought a key opening a room of stock and nothing to pay with stands in a
// ground no such check sees. A player stuck in ground R with an unbought key K has spent at most what R sells less K's
// price, so a check asked of every ground R ("what lies in R pays for everything R sells") keeps every key within
// reach whatever was bought first. Core lists the grounds; what pays and what a piece costs is the caller's.
//
// Grounds are found breadth-first from nothing bought, buying one key piece in a ground's stock at a time. Only keys
// are bought: a piece no lock names opens nothing, so it never changes where a player can stand. Two bought sets
// reaching the same rewards are one ground; they are walked on apart unless they also hold alike (`heldKey`), since a
// key that opens nothing yet (one of two pieces a lock asks for) changes what the next key opens.

export type Ground = {
  /** The key pieces bought to stand here, in the order they were bought. */
  bought: readonly TreasureReward[]
  /** The rooms' own rewards in reach. */
  rewards: readonly TreasureReward[]
  /** Every piece of stock for sale in the reached shops, bought or not. */
  stock: readonly TreasureReward[]
}

export type GroundsOptions = {
  isKey: (reward: TreasureReward) => boolean
  /** The most walk states to visit; past it the enumeration stops and says how many it saw. */
  cap: number
}

const idsOf = (rewards: Iterable<TreasureReward>): string => identitiesOf(rewards).join(",")

const groundKey = (result: HoldingResult): string => `${idsOf(result.rewards)}|${idsOf(result.stock)}`
const stateKey = (result: HoldingResult): string => `${groundKey(result)}|${result.heldKey}`

/** Every ground a player can stand in, or, past the cap, how many walk states were seen when it stopped. */
export const reachableGrounds = (
  walk: Pick<GateWalk, "holding">,
  { isKey, cap }: GroundsOptions
): { grounds: Ground[] } | { overCap: number } => {
  const grounds: Ground[] = []
  const groundsSeen = new Set<string>()
  const statesSeen = new Set<string>()
  const setsSeen = new Set<string>()
  const queue: TreasureReward[][] = [[]]
  setsSeen.add("")
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const bought = next
    const result = walk.holding(new Set(bought))
    const state = stateKey(result)
    if (statesSeen.has(state)) continue
    statesSeen.add(state)
    if (statesSeen.size > cap) return { overCap: statesSeen.size }
    const ground = groundKey(result)
    if (!groundsSeen.has(ground)) {
      groundsSeen.add(ground)
      grounds.push({ bought, rewards: result.rewards, stock: result.stock })
    }
    for (const piece of result.stock) {
      if (!isKey(piece) || bought.includes(piece)) continue
      const more = [...bought, piece]
      const set = idsOf(more)
      if (setsSeen.has(set)) continue
      setsSeen.add(set)
      queue.push(more)
    }
  }
  return { grounds }
}

/**
 * Which rewards are keys: a reward is one when a bucket it feeds (through the support) is named by some lock of the
 * world — a journey's entry lock, a tier's unlock group, the hidden requirement, or a gate or tableau carved on one of
 * its floors (a bucket whose count stands for further facts counts when the first of them is named). Every floor is carved as
 * the walk carves it, so a tableau's requirement is read where play reads it.
 */
export const keyRewardsOf = (
  configs: Record<string, SiteConfig[]>,
  support: ReachabilitySupport,
  carve: Omit<FloorCarve, "support"> = {}
): ((reward: TreasureReward) => boolean) => {
  const named = new Set<string>()
  for (const tier of TIER_LADDER)
    for (const group of support.tierUnlockGroups?.(tier) ?? []) for (const b of group) named.add(b)
  const hidden = support.hiddenRequirement?.()
  if (hidden !== undefined) named.add(hidden)
  for (const [journeyId, sites] of Object.entries(configs)) {
    for (const lock of support.journeyEntryLocks?.(journeyId) ?? []) named.add(lock.bucket)
    sites.forEach((site, levelIndex) => {
      site.forEach((_, i) => {
        const { grid } = carveSiteFloor({ journeyId, levelIndex }, site, i, undefined, { ...carve, support })
        for (const row of grid.cells)
          for (const cell of row) {
            if (cell.type !== "room") continue
            if (cell.requiredKeyId) named.add(cell.requiredKeyId)
            for (const id of cell.requiredKeyIds ?? []) named.add(id)
          }
      })
    })
  }
  const opens = (bucket: string): boolean =>
    named.has(bucket) || (support.factsForCount?.(bucket, 1) ?? []).some(fact => named.has(fact))
  return reward => {
    const bucket = support.bucketForReward?.(reward)
    return (bucket !== undefined && opens(bucket)) || (support.alsoHarvests?.(reward) ?? []).some(opens)
  }
}
