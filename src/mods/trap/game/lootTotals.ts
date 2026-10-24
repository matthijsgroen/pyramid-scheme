import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward } from "@/worldGen/configRewards"

// The trap mod's row of the loot report: waterskins placed. Nothing demands a number of them.
// Drops with the mod.
export const trapLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  let found = 0
  forEachConfigReward(configs, reward => {
    if (reward.type === "waterskin") found++
  })
  return [{ label: "Waterskins", found }]
}
