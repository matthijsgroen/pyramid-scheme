import type { FloorConfig, SideSection, SiteConfig, TreasureReward } from "@/worldGen/types"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import { makeGateWalk, type GateWalk } from "@/worldGen/gateWalk"
import type { PurchaseTable } from "./purchases"

// Made-up worlds for the money checks. Each journey is one starter floor: money on its puzzles, perhaps empty puzzles
// for the money fill, perhaps a shop, perhaps a hidden side section holding money or empty puzzles, perhaps a treasure
// at its main end. A journey's entrance asks for facts, each a
// purchase's or the made-up lens's; the lens is also what reveals a hidden section.

export const purchase = (id: string): TreasureReward => ({ type: "purchase", id })
export const money = (amount: number): TreasureReward => ({ type: "money", amount })
export const lens: TreasureReward = { type: "madeUpLens" }
export const SIGHT = "made-up-sight"

export type GroundJourney = {
  /** Each a money drop on one of the floor's puzzles. */
  money?: number[]
  /** Puzzles after the money drops that hold nothing yet. */
  slots?: number
  /** What the journey's shop sells; no shop when absent or empty. */
  stock?: TreasureReward[]
  /** Money in a hidden side section, seen only with the lens. */
  hiddenMoney?: number
  /** Puzzles holding nothing yet in a hidden side section, seen only with the lens. */
  hiddenSlots?: number
  mainEnd?: TreasureReward
  /** Facts the entrance asks for: `purchase:<id>` or SIGHT. */
  needs?: string[]
}

const floorOf = ({
  money: drops = [],
  slots = 0,
  stock = [],
  hiddenMoney,
  hiddenSlots = 0,
  mainEnd,
}: GroundJourney): FloorConfig => {
  const sideSections: SideSection[] = []
  if (stock.length > 0)
    sideSections.push({ pathPuzzles: 0, difficulty: "starter", end: "treasure", encounter: "fez-shop", rewards: stock })
  if (hiddenMoney !== undefined || hiddenSlots > 0)
    sideSections.push({
      pathPuzzles: hiddenSlots,
      difficulty: "starter",
      end: "treasure",
      hidden: true,
      ...(hiddenSlots > 0 ? { rewards: Array<TreasureReward | undefined>(hiddenSlots).fill(undefined) } : {}),
      ...(hiddenMoney !== undefined ? { endReward: money(hiddenMoney) } : {}),
    })
  return {
    pathPuzzles: Math.max(1, drops.length + slots),
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    rewards: [...drops.map(money), ...Array<TreasureReward | undefined>(slots).fill(undefined)],
    ...(mainEnd ? { mainEndReward: mainEnd } : {}),
    sideSections,
  }
}

const supportFor = (journeys: Record<string, GroundJourney>): ReachabilitySupport => ({
  bucketForReward: reward => (reward.type === "purchase" ? `purchase:${reward.id as string}` : undefined),
  alsoHarvests: reward => (reward.type === "madeUpLens" ? [SIGHT] : []),
  journeyEntryLocks: journeyId => (journeys[journeyId]?.needs ?? []).map(bucket => ({ bucket, threshold: 1 })),
  hiddenRequirement: () => SIGHT,
})

/** A fresh gate walk over the world as it stands now, carving afresh. */
export const walkOver = (configs: Record<string, SiteConfig[]>, journeys: Record<string, GroundJourney>): GateWalk =>
  makeGateWalk({
    configs,
    journeyMeta: Object.fromEntries(Object.keys(journeys).map(id => [id, { tier: "starter" as const }])),
    support: supportFor(journeys),
  })

export const groundWorld = (
  journeys: Record<string, GroundJourney>
): { configs: Record<string, SiteConfig[]>; walk: GateWalk } => {
  const configs = Object.fromEntries(Object.entries(journeys).map(([id, journey]) => [id, [[floorOf(journey)]]]))
  return { configs, walk: walkOver(configs, journeys) }
}

/** A made-up purchase table: each id at its price, sold in the first shop of `soldAt`, opening nothing the table says. */
export const tableOf = (prices: Record<string, number>, soldAt = "start"): PurchaseTable =>
  Object.entries(prices).map(([id, price]) => ({ id, fact: `purchase:${id}`, price, soldAt: { journeyId: soldAt } }))
