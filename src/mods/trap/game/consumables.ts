import type { ConsumableSpec } from "@/worldGen/dynamicLoot"
import { rollConsumable } from "@/worldGen/rewards"

// Trap owns consumables (docs/mods/distribution-primitive-design.md): density (what share of
// puzzle slots carry one) and rarity (which type). Core allocates the consumable-role slots; this
// fills them. Trap off → no spec injected → those slots fall through to junk/empty.
//
// Fraction 441/1714 and the {bandage:3, oil:1, trapTool:1} rate reproduce the retired core
// placement exactly, so the world is byte-identical with trap on.
const RATES = { bandage: 3, oil: 1, trapTool: 1 }

export const TRAP_CONSUMABLES: ConsumableSpec = {
  fraction: 441 / 1714,
  roll: seed => rollConsumable(seed, RATES),
}
