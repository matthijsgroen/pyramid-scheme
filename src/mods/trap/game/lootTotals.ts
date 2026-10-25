import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward } from "@/worldGen/configRewards"
import { difficulties } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
import { trapsByTier } from "./trapRooms"

// The trap mod's rows of the loot report, per tier (a section's own difficulty): the trap rooms placed
// (a trapped section holds one per puzzle) and the waterskins placed. Drops with the mod.
export const trapLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  const traps = trapsByTier(configs)
  const waterskins = Object.fromEntries(difficulties.map(tier => [tier, 0])) as Record<Difficulty, number>
  forEachConfigReward(configs, (reward, owner) => {
    if (reward.type === "waterskin") waterskins[owner.difficulty]++
  })
  return [
    ...difficulties.map(tier => ({ label: `Traps (${tier})`, found: traps[tier] })),
    ...difficulties.map(tier => ({ label: `Waterskins (${tier})`, found: waterskins[tier] })),
  ]
}
