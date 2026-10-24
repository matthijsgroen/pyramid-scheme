import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward } from "@/worldGen/configRewards"
import { sellValueForItemId } from "@/data/sellables"
import { totalBuyable } from "./economyGuard"
import { moneyRewardSchema, sellableRewardSchema } from "./rewardSchemas"

// The shop mod's rows of the loot report: the coins and sellables placed, and what they add up to
// against the price of everything the shops stock. Income counts money and sellables wherever placed,
// shop stock included (none is placed as stock today). Drops with the mod.
export const shopLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  let coinDrops = 0
  let coins = 0
  let sellables = 0
  let sellValue = 0
  forEachConfigReward(configs, reward => {
    if (reward.type === "money") {
      coinDrops++
      coins += moneyRewardSchema.parse(reward).amount
    } else if (reward.type === "sellable") {
      sellables++
      sellValue += sellValueForItemId(sellableRewardSchema.parse(reward).itemId)
    }
  })
  return [
    { label: "Coin drops", found: coinDrops },
    { label: "Coins", found: coins, unit: "coins" },
    { label: "Sellables", found: sellables },
    { label: "Sell value", found: sellValue, unit: "coins" },
    { label: "Income against buyable stock", found: coins + sellValue, needed: totalBuyable(configs), unit: "coins" },
  ]
}
