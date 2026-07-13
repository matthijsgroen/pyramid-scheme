import type { ConsumableSpec } from "@/worldGen/dynamicLoot"
import { rollConsumable } from "@/worldGen/rewards"
import { difficultyCompare } from "@/data/difficultyLevels"

// Trap owns consumables (docs/mods/distribution-primitive-design.md): density (what share of
// puzzle slots carry one), rarity (which type), and eligibility. Consumables sit only on expert+
// paths — traps arrive at expert, so there's no reason to find trap supplies in the open early
// tiers (design). A slot's tier is its own section difficulty (Part B), so a low-tier ward path
// deep in a wizard tomb is still ineligible. Trap off → no spec → no consumables placed.
const RATES = { bandage: 3, oil: 1, trapTool: 1 }

export const TRAP_CONSUMABLES: ConsumableSpec = {
  fraction: 441 / 1714,
  roll: seed => rollConsumable(seed, RATES),
  eligible: slot => difficultyCompare(slot.tier, "expert") >= 0,
}
