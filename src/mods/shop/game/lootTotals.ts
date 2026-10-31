import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import type { GateWalk } from "@/worldGen/gateWalk"
import { forEachConfigReward } from "@/worldGen/configRewards"
import { sellValueForItemId } from "@/data/sellables"
import { groundLedger } from "./economyGuard"
import { PURCHASES, type PurchaseTable } from "./purchases"
import { moneyRewardSchema, sellableRewardSchema } from "./rewardSchemas"

// The shop mod's rows of the loot report: the coins and sellables placed, the purchases in shops against the table,
// and for every ground a player can stand in (grounds.ts) the money lying there against everything for sale there —
// the rows the economy guard holds to. Drops with the mod.
export const shopLootTotals = (
  configs: Record<string, SiteConfig[]>,
  walk: GateWalk,
  purchases: PurchaseTable = PURCHASES
): LootTotal[] => {
  let coinDrops = 0
  let coins = 0
  let sellables = 0
  let sellValue = 0
  let purchasesStocked = 0
  forEachConfigReward(configs, reward => {
    if (reward.type === "money") {
      coinDrops++
      coins += moneyRewardSchema.parse(reward).amount
    } else if (reward.type === "sellable") {
      sellables++
      sellValue += sellValueForItemId(sellableRewardSchema.parse(reward).itemId)
    } else if (reward.type === "purchase") purchasesStocked++
  })
  const ledger = groundLedger(configs, walk, { purchases })
  const grounds: LootTotal[] =
    "rows" in ledger
      ? ledger.rows.map(row => ({
          label: `Money with ${row.label} bought`,
          found: row.income,
          needed: row.buyable,
          unit: "coins",
        }))
      : [{ label: "Walk states before the ground cap stopped", found: ledger.overCap }]
  return [
    { label: "Coin drops", found: coinDrops },
    { label: "Coins", found: coins, unit: "coins" },
    { label: "Sellables", found: sellables },
    { label: "Sell value", found: sellValue, unit: "coins" },
    { label: "Purchases in shops", found: purchasesStocked, needed: purchases.length },
    ...grounds,
  ]
}
