import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward } from "@/worldGen/configRewards"
import { difficulties } from "@/data/difficultyLevels"
import type { CampStepTable } from "./campSteps"
import { CAMP_STEPS, campDemand } from "./campSteps"

// The camp mod's rows of the loot report: finds and structure parts placed, wherever they lie, against what
// the step table asks for. Drops with the mod.
export const makeCampLootTotals =
  (table: CampStepTable) =>
  (configs: Record<string, SiteConfig[]>): LootTotal[] => {
    const demand = campDemand(table)
    let finds = 0
    let parts = 0
    forEachConfigReward(configs, reward => {
      if (reward.type === "campFind") finds++
      else if (reward.type === "campPart") parts++
    })
    const sum = (key: "finds" | "parts") => difficulties.reduce((total, tier) => total + demand[tier][key], 0)
    return [
      { label: "Camp finds", found: finds, needed: sum("finds") },
      { label: "Structure parts", found: parts, needed: sum("parts") },
    ]
  }

export const campLootTotals = makeCampLootTotals(CAMP_STEPS)
