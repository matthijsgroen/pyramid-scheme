import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward } from "@/worldGen/configRewards"
import { MOSAIC_TOTAL } from "./mosaicCurrency"

// The mosaic mod's row of the loot report: pieces placed against the steps its registers hold.
// Drops with the mod.
export const mosaicLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  let found = 0
  forEachConfigReward(configs, reward => {
    if (reward.type === "mosaicPiece") found++
  })
  return [{ label: "Mosaic pieces", found, needed: MOSAIC_TOTAL }]
}
