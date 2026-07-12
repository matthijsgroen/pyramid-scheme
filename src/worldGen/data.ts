import type { JourneyDef, TombJourneyDef, Tier, PathPuzzlesRange } from "./types"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "../data/journeyStructure"
import { tableauLevels } from "../data/tableaus"

export const WORLD_SEED = 42_195_837

// pathPuzzles is worldGen-only; merged with PYRAMID_STRUCTURES (single source of truth for id/tier/levelCount).
// Each entry is the puzzle-count progression across the journey's pyramids, first to last —
// explicit and authored, no implicit scaling applied anywhere else.
const PYRAMID_PATH_PUZZLES: Record<string, PathPuzzlesRange> = {
  starter_1: { start: 1, end: 1 },
  starter_2: { start: 1, end: 1 },
  starter_3: { start: 2, end: 4 },
  starter_4: { start: 2, end: 4 },
  junior_1: { start: 2, end: 4 },
  junior_2: { start: 3, end: 5 },
  junior_3: { start: 4, end: 6 },
  junior_4: { start: 3, end: 5 },
  expert_1: { start: 3, end: 5 },
  expert_2: { start: 4, end: 6 },
  expert_3: { start: 5, end: 7 },
  expert_4: { start: 4, end: 6 },
  master_1: { start: 4, end: 6 },
  master_2: { start: 6, end: 8 },
  master_3: { start: 6, end: 8 },
  master_4: { start: 5, end: 7 },
  wizard_1: { start: 7, end: 9 },
  wizard_2: { start: 7, end: 9 },
  wizard_3: { start: 7, end: 9 },
  wizard_4: { start: 7, end: 9 },
}

export const PYRAMID_JOURNEYS: JourneyDef[] = PYRAMID_STRUCTURES.map(s => ({
  ...s,
  tier: s.tier as Tier,
  pathPuzzles: PYRAMID_PATH_PUZZLES[s.id] ?? 3,
}))

export const TOMB_JOURNEYS: TombJourneyDef[] = TOMB_STRUCTURES.map(s => ({ ...s, tier: s.tier as Tier }))

// Hieroglyph IDs per tier — mirrors TOMB_SYMBOLS in tableaus.ts; these are inventory item IDs
export const TOMB_SYMBOLS: Record<Tier, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: ["p1", "p11", "p9", "a2", "a13", "art2", "art7", "art12", "d2", "d15"],
  expert: ["p2", "p3", "p7", "p12", "a5", "a7", "a11", "art3", "art4", "art6", "art14", "d3", "d4", "d9"],
  master: ["p4", "p5", "p14", "p15", "a1", "a3", "a14", "a15", "art9", "art10", "art11", "art15", "d5", "d6", "d10"],
  wizard: ["p6", "p13", "a4", "a9", "a10", "a12", "d7", "d8", "d11", "d12", "d13", "d14"],
}

// Fragment count matrix: tier → first-blocking section → required fragments
// "revisit" applies to hieroglyphs not needed in section 1 of their tier's tomb run 1
const FRAGMENT_MATRIX: Record<Tier, Record<number, number> & { revisit: number }> = {
  starter: { 1: 2, 2: 3, revisit: 3 },
  junior: { 1: 3, 2: 4, 3: 4, revisit: 4 },
  expert: { 1: 4, 2: 5, 3: 5, 4: 6, revisit: 5 },
  master: { 1: 5, 2: 6, 3: 6, 4: 6, 5: 7, revisit: 6 },
  wizard: { 1: 6, 2: 7, 3: 7, 4: 7, 5: 8, 6: 8, revisit: 8 },
}

// Per-hieroglyph required fragment count, derived from tableauLevels + FRAGMENT_MATRIX.
// A tier's tomb can be split across several journeys once a single tomb got too large for
// exploration (pyramid-interior-design.md §5) — a symbol may only ever appear in a
// secondary tomb's tableaus, so "first section" must search every tomb of the tier, not
// just its primary (`${tier}_treasure_tomb`).
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

// The world-wide total (sum of every hieroglyph's required count) is the tableau currency's
// own number, not core's — see src/mods/tableau/game/hieroglyphCurrency.ts's
// EXPECTED_HIEROGLYPH_FRAGMENTS (core only supplies the threshold data it shares with
// reachability.ts, not the validation expectation itself).

// Which pyramid tiers can host fragments from each hieroglyph tier
// Rule: fragments appear in same tier and +1 adjacent tier (overlap for revisit motivation)
export const FRAGMENT_HOST_TIERS: Record<Tier, Tier[]> = {
  starter: ["starter", "junior"],
  junior: ["junior", "expert"],
  expert: ["expert", "master"],
  master: ["master", "wizard"],
  wizard: ["expert", "master", "wizard"],
}
