import type { Difficulty } from "@/data/difficultyLevels"
import type { JourneyEntryLock } from "@/worldGen/reachability"
import type { ShopStockAssignment } from "@/worldGen/shopStock"

// What Fez sells for the caravan: each purchase is a key. Holding its fact opens the gate it names, a whole tier or one
// journey, and the worklist places it in its own shop before that gate (purchaseCurrency.ts). This table is the shop's
// one source for prices, shops and gates. The facts (`purchase:<id>`) are the vocabulary another mod may name in its
// own data (the camp's steps); no mod imports this file.
export type PurchaseGate = { tier: Difficulty } | { journeyId: string }

export type Purchase = {
  id: string
  fact: string
  price: number
  /** The Fez shop that sells it: the `nth` shop of this journey (default the first). */
  soldAt: { journeyId: string; nth?: number }
  /** The gate holding it opens. A purchase with none is bought for its own sake. */
  opens?: PurchaseGate
}

export type PurchaseTable = readonly Purchase[]

export const purchaseFact = (id: string): string => `purchase:${id}`

export const PURCHASES: PurchaseTable = [
  {
    id: "donkey",
    fact: purchaseFact("donkey"),
    price: 200,
    soldAt: { journeyId: "junior_treasure_tomb" },
    opens: { tier: "expert" },
  },
  {
    id: "cart",
    fact: purchaseFact("cart"),
    price: 300,
    soldAt: { journeyId: "expert_treasure_tomb" },
    opens: { tier: "master" },
  },
  {
    id: "camel",
    fact: purchaseFact("camel"),
    price: 250,
    soldAt: { journeyId: "expert_treasure_tomb" },
    opens: { journeyId: "expert_treasure_tomb_b" },
  },
  {
    id: "secondDonkey",
    fact: purchaseFact("secondDonkey"),
    price: 250,
    soldAt: { journeyId: "master_treasure_tomb" },
    opens: { tier: "wizard" },
  },
  {
    id: "secondCamel",
    fact: purchaseFact("secondCamel"),
    price: 250,
    soldAt: { journeyId: "master_treasure_tomb" },
    opens: { journeyId: "master_treasure_tomb_b" },
  },
  {
    id: "sturdyCart",
    fact: purchaseFact("sturdyCart"),
    price: 400,
    soldAt: { journeyId: "wizard_treasure_tomb" },
    opens: { journeyId: "wizard_treasure_tomb_b" },
  },
  {
    id: "caravanBanner",
    fact: purchaseFact("caravanBanner"),
    price: 500,
    soldAt: { journeyId: "wizard_treasure_tomb_c" },
  },
]

// The tiers a player must reach without buying anything: the first two tiers teach the game before Fez sells keys.
const UNGATED_TIERS: readonly Difficulty[] = ["starter", "junior"]

const gateName = (gate: PurchaseGate): string => ("tier" in gate ? `tier ${gate.tier}` : `journey ${gate.journeyId}`)

/** Every way the table is unsound, one line each, naming the purchase. Empty for a sound table. */
export const purchaseProblems = (table: PurchaseTable, tombJourneyIds: readonly string[]): string[] => {
  const problems: string[] = []
  const seen = (key: (p: Purchase) => string | undefined, what: string) => {
    const first = new Map<string, string>()
    for (const p of table) {
      const k = key(p)
      if (k === undefined) continue
      const earlier = first.get(k)
      if (earlier === undefined) first.set(k, p.id)
      // Two rows under one id are one problem, the duplicate id, however much else they share.
      else if (what === "id" || earlier !== p.id) problems.push(`${p.id}: ${what} ${k} is also ${earlier}'s`)
    }
  }
  seen(p => p.id, "id")
  seen(p => (p.opens ? gateName(p.opens) : undefined), "gate")
  for (const p of table) {
    if (p.fact !== purchaseFact(p.id)) problems.push(`${p.id}: fact ${p.fact} is not ${purchaseFact(p.id)}`)
    if (!Number.isInteger(p.price) || p.price <= 0)
      problems.push(`${p.id}: price ${p.price} is not a whole number above 0`)
    if (!tombJourneyIds.includes(p.soldAt.journeyId))
      problems.push(`${p.id}: sold at ${p.soldAt.journeyId}, not a tomb`)
    if (p.opens && "tier" in p.opens && UNGATED_TIERS.includes(p.opens.tier))
      problems.push(`${p.id}: opens tier ${p.opens.tier}, which no purchase may gate`)
  }
  return problems
}

/** The table, refused whole when it is unsound, so no world is built on it. */
export const soundPurchases = (table: PurchaseTable, tombJourneyIds: readonly string[]): PurchaseTable => {
  const problems = purchaseProblems(table, tombJourneyIds)
  if (problems.length > 0) throw new Error(`purchases: ${problems.join("; ")}`)
  return table
}

export type PurchaseRequirements = {
  /** One group per purchase opening this tier, so each must be held. */
  tierGroups: (tier: Difficulty) => string[][]
  /** One lock per purchase opening this journey. */
  entryLocks: (journeyId: string) => JourneyEntryLock[]
}

export const requirementsFor = (table: PurchaseTable): PurchaseRequirements => ({
  tierGroups: tier => table.filter(p => p.opens && "tier" in p.opens && p.opens.tier === tier).map(p => [p.fact]),
  entryLocks: journeyId =>
    table
      .filter(p => p.opens && "journeyId" in p.opens && p.opens.journeyId === journeyId)
      .map(p => ({ bucket: p.fact, threshold: 1 })),
})

/** One stock placeholder per purchase in its own shop, tagged with its fact, for the worklist to fill. */
export const purchaseShopStock = (table: PurchaseTable): ShopStockAssignment[] =>
  table.map(p => ({ journeyId: p.soldAt.journeyId, prefers: p.fact, ...(p.soldAt.nth ? { nth: p.soldAt.nth } : {}) }))
