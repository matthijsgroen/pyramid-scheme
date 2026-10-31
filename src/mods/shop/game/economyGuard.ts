import type { SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"
import type { WorldValidator } from "@/worldGen/validate"
import type { GateWalk } from "@/worldGen/gateWalk"
import { reachableGrounds } from "@/worldGen/grounds"
import { sellValueForItemId } from "@/data/sellables"
import { moneyRewardSchema, purchaseRewardSchema, sellableRewardSchema } from "./rewardSchemas"
import { priceFor } from "./pricing"
import { PURCHASES, type PurchaseTable } from "./purchases"
import { moneyLedger, rewardName, type MoneyRow } from "./moneyLedger"

/** Coins a reward brings in: a money drop's amount, a sellable's sell value, nothing for anything else. */
export const incomeOf = (reward: TreasureReward): number => {
  if (reward.type === "money") return moneyRewardSchema.parse(reward).amount
  if (reward.type === "sellable") return sellValueForItemId(sellableRewardSchema.parse(reward).itemId)
  return 0
}

/**
 * The price of each piece of stock, by the piece itself: a walk lists the very objects the configs hold, and a piece's
 * price depends on its shop's tier. Asked for a piece no shop of the configs sells, it throws: pricing that at 0 would
 * pass a ground the player cannot pay for.
 */
export const stockPrices = (
  allConfigs: Record<string, SiteConfig[]>,
  purchases: PurchaseTable = PURCHASES
): ((reward: TreasureReward) => number) => {
  const prices = new Map<TreasureReward, number>()
  const tally = (s: SubSection) => {
    if (s.encounter !== "fez-shop") return
    for (const r of s.rewards ?? []) if (r) prices.set(r, priceFor(r, s.difficulty, purchases))
  }
  for (const siteConfigs of Object.values(allConfigs))
    for (const floors of siteConfigs)
      for (const floor of floors)
        for (const s of floor.sideSections) {
          tally(s)
          for (const sub of s.sideSections ?? []) tally(sub)
        }
  return reward => {
    const price = prices.get(reward)
    if (price === undefined)
      throw new Error(`[worldSpec] Shop economy guard: ${rewardName(reward)} is for sale in no shop.`)
    return price
  }
}

/** A purchase stocked twice, or in no shop the strict walk reaches. Where its shop lies against its gate is the worklist's. */
export const purchasePlacementProblems = (walk: GateWalk, purchases: PurchaseTable = PURCHASES): string[] => {
  const stocked = new Map<string, number>()
  for (const reward of walk().rewards)
    if (reward.type === "purchase") {
      const { id } = purchaseRewardSchema.parse(reward)
      stocked.set(id, (stocked.get(id) ?? 0) + 1)
    }
  return purchases.flatMap(({ id }) => {
    const count = stocked.get(id) ?? 0
    if (count === 0) return [`purchase ${id} is in no shop the walk reaches`]
    if (count > 1) return [`purchase ${id} is stocked ${count} times`]
    return []
  })
}

// Past this many walk states the world has too many ways to buy its keys to check, and the build is refused.
export const GROUND_CAP = 4096

/** One money row per ground a player can stand in, or how many walk states the enumeration saw before the cap. */
export const groundLedger = (
  allConfigs: Record<string, SiteConfig[]>,
  walk: GateWalk,
  { purchases = PURCHASES, cap = GROUND_CAP }: { purchases?: PurchaseTable; cap?: number } = {}
): { rows: MoneyRow[] } | { overCap: number } => {
  const found = reachableGrounds(walk, { isKey: walk.isKey, cap })
  if (!("grounds" in found)) return found
  return { rows: moneyLedger(found.grounds, stockPrices(allConfigs, purchases), incomeOf) }
}

// Economy guard: in every ground a player can stand in (grounds.ts), the money lying there covers everything for sale
// there. A player stuck with an unbought key has then spent at most what that ground sells less the key's price, so
// every key stays affordable whatever was bought first. The last ground holds every key: it is the whole world.
// Throws at build, not at runtime. Shop-owned: injected as the shop mod's worldValidator, so the check drops out when
// shop leaves REGISTERED_MODS.
export const runEconomyGuard = (
  allConfigs: Record<string, SiteConfig[]>,
  _reachable: readonly TreasureReward[],
  walk: GateWalk,
  options: { purchases?: PurchaseTable; cap?: number } = {}
): void => {
  const problems = purchasePlacementProblems(walk, options.purchases)
  if (problems.length > 0) throw new Error(`[worldSpec] Shop economy guard failed: ${problems.join("; ")}.`)
  const ledger = groundLedger(allConfigs, walk, options)
  if (!("rows" in ledger))
    throw new Error(
      `[worldSpec] Shop economy guard failed: more than ${options.cap ?? GROUND_CAP} ways to stand in the world ` +
        `(${ledger.overCap} walk states seen).`
    )
  const short = ledger.rows.filter(row => row.margin < 0)
  if (short.length > 0)
    throw new Error(
      `[worldSpec] Shop economy guard failed: ${short
        .map(
          row => `with ${row.label} bought, income ${row.income} is short of buyable ${row.buyable} by ${-row.margin}`
        )
        .join("; ")}.`
    )
}

// The guard checks the finished world — it can't pass until the whole world is grown, so it
// blocks mid-exercise regeneration during world authoring. SKIP_ECONOMY_GUARD lets an author
// iterate + inspect (yarn world-info) with structural validation still on; the real
// generate-world for commit must run without it. ponytail: env escape hatch, not a config knob.
export const shopEconomyGuard: WorldValidator = (allConfigs, reachable, walk) => {
  if (process.env.SKIP_ECONOMY_GUARD) return
  runEconomyGuard(allConfigs, reachable, walk)
}
