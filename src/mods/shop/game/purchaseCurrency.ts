import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import type { Tier } from "@/worldGen/types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "@/worldGen/data"
import type { PurchaseTable } from "./purchases"

// The purchases as a gating currency on the reachability worklist. Each purchase is one instance, and its only home is
// the stock placeholder tagged with its fact in its own shop (purchaseShopStock), so `rank` offers that placeholder and
// nothing else: a purchase never lands in another purchase's placeholder or in free-world loot. The worklist places it
// once its gate is the frontier and its shop is reached, and refuses the build, naming the gate, when the shop lies
// behind the gate it opens. A purchase that opens nothing is placed by the completion pass (`allBuckets`).
//
// The harvest (a purchase reward → its fact) rides the shop's reachability support, not this currency, so the
// spread-currency count check does not count purchases; the worklist itself refuses a purchase it cannot place.
export const purchaseCurrency = (table: PurchaseTable): CurrencyDistribution => {
  const byFact = new Map(table.map(p => [p.fact, p]))
  const tierOf = (journeyId: string): Tier =>
    [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS].find(j => j.id === journeyId)?.tier ?? "starter"
  return {
    ownsBucket: bucket => byFact.has(bucket),
    toReward: id => ({ type: "purchase", id }),
    allBuckets: () => table.map(p => p.fact),
    demandFor: bucket => {
      const purchase = byFact.get(bucket)
      if (!purchase) throw new Error(`purchases: bucket "${bucket}" names no purchase`)
      return {
        bucket,
        instanceId: purchase.id,
        tier: tierOf(purchase.soldAt.journeyId),
        preferredWardKeys: [],
        required: 1,
        totalRequired: 1,
      }
    },
    rank: (candidates, demand) => candidates.filter(slot => slot.preference === demand.bucket),
  }
}
