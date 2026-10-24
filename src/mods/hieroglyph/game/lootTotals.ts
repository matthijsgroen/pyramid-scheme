import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { hieroglyphCoverage } from "./fragmentFinalize"
import { HIEROGLYPH_REQUIRED } from "./hieroglyphData"

// The hieroglyph mod's row of the loot report: fragments placed against the number every sign needs.
// Drops with the mod.
export const hieroglyphLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  const { total, target } = hieroglyphCoverage(configs, HIEROGLYPH_REQUIRED)
  return [{ label: "Hieroglyph fragments", found: total, needed: target }]
}
