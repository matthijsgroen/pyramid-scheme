import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward, forEachConfigSection } from "@/worldGen/configRewards"
import { difficulties } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
import { ARITHMETIC_REFLEX_META } from "./arithmeticReflex/meta"
import { CLOCK_REFLEX_META } from "./clockReflex/meta"

const TRAP_ENCOUNTERS: ReadonlySet<string | undefined> = new Set([
  "trap",
  ARITHMETIC_REFLEX_META.id,
  CLOCK_REFLEX_META.id,
])

// The trap mod's rows of the loot report, per tier (a section's own difficulty): the trap rooms placed
// (a trapped section holds one per puzzle) and the waterskins placed. Nothing demands a number of them.
// Drops with the mod.
export const trapLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  const traps = Object.fromEntries(difficulties.map(tier => [tier, 0])) as Record<Difficulty, number>
  const waterskins = { ...traps }
  forEachConfigSection(configs, section => {
    const first = Array.isArray(section.encounter) ? section.encounter[0] : section.encounter
    if (TRAP_ENCOUNTERS.has(first)) traps[section.difficulty] += section.pathPuzzles
  })
  forEachConfigReward(configs, (reward, owner) => {
    if (reward.type === "waterskin") waterskins[owner.difficulty]++
  })
  return [
    ...difficulties.map(tier => ({ label: `Traps (${tier})`, found: traps[tier] })),
    ...difficulties.map(tier => ({ label: `Waterskins (${tier})`, found: waterskins[tier] })),
  ]
}
