import { TOMB_SYMBOLS, tableauLevels } from "@/data/tableaus"
import { TOMB_JOURNEYS } from "@/worldGen/data"
import type { Tier } from "@/worldGen/types"

// The hieroglyph mod's own fragment-requirement numbers, derived from the authored tableau
// levels. Lives in the mod (docs/mods/TARGET.md rule 2: a mod owns its target count). Core
// reachability + serializer receive HIEROGLYPH_REQUIRED only via injection — they never import
// it, so removing the mod from REGISTERED_MODS drops the number from world-gen entirely.
//
// TOMB_SYMBOLS (hieroglyph ids per tier) is authored in @/data/tableaus; re-exported here so
// the mod has one hieroglyph-data entry point.
export { TOMB_SYMBOLS }

// Fragment count matrix: tier → first-blocking section → required fragments. "revisit" applies
// to hieroglyphs not needed in section 1 of their tier's tomb run 1.
const FRAGMENT_MATRIX: Record<Tier, Record<number, number> & { revisit: number }> = {
  starter: { 1: 2, 2: 3, revisit: 3 },
  junior: { 1: 3, 2: 4, 3: 4, revisit: 4 },
  expert: { 1: 4, 2: 5, 3: 5, 4: 6, revisit: 5 },
  master: { 1: 5, 2: 6, 3: 6, 4: 6, 5: 7, revisit: 6 },
  wizard: { 1: 6, 2: 7, 3: 7, 4: 7, 5: 8, 6: 8, revisit: 8 },
}

// Per-hieroglyph required fragment count. A tier's tomb can be split across several journeys
// once a single tomb got too large for exploration (pyramid-interior-design.md §5) — a symbol
// may only ever appear in a secondary tomb's tableaus, so "first section" searches every tomb
// of the tier, not just its primary (`${tier}_treasure_tomb`).
export const HIEROGLYPH_REQUIRED: Record<string, number> = (() => {
  const result: Record<string, number> = {}
  for (const [tier, ids] of Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]) {
    const tierTombIds = new Set(TOMB_JOURNEYS.filter(j => j.tier === tier).map(j => j.id))
    const tombLevels = tableauLevels.filter(t => tierTombIds.has(t.tombJourneyId))
    const matrix = FRAGMENT_MATRIX[tier]
    for (const id of ids) {
      const firstSection = tombLevels
        .filter(t => t.inventoryIds.includes(id))
        .reduce((min, t) => Math.min(min, t.runNumber), Infinity)
      result[id] = isFinite(firstSection) ? (matrix[firstSection] ?? matrix.revisit) : matrix.revisit
    }
  }
  return result
})()
