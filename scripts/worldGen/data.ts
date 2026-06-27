import type { JourneyDef, TombJourneyDef, Tier } from "./types"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "../../src/data/journeyStructure"

export const WORLD_SEED = 42_195_837

// pathPuzzles is worldGen-only; merged with PYRAMID_STRUCTURES (single source of truth for id/tier/levelCount)
const PYRAMID_PATH_PUZZLES: Record<string, number> = {
  starter_1: 2,
  starter_2: 2,
  starter_3: 3,
  starter_4: 3,
  junior_1: 3,
  junior_2: 4,
  junior_3: 5,
  junior_4: 4,
  expert_1: 4,
  expert_2: 5,
  expert_3: 6,
  expert_4: 5,
  master_1: 5,
  master_2: 7,
  master_3: 7,
  master_4: 6,
  wizard_1: 8,
  wizard_2: 8,
  wizard_3: 8,
  wizard_4: 8,
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

// How many fragments each hieroglyph needs across all pyramid journeys
export const FRAGMENT_COUNT: Record<Tier, number> = {
  starter: 2,
  junior: 2,
  expert: 3,
  master: 3,
  wizard: 3,
}

// Which pyramid tiers can host fragments from each hieroglyph tier
// Rule: fragments appear in same tier and +1 adjacent tier (overlap for revisit motivation)
export const FRAGMENT_HOST_TIERS: Record<Tier, Tier[]> = {
  starter: ["starter", "junior"],
  junior: ["junior", "expert"],
  expert: ["expert", "master"],
  master: ["master", "wizard"],
  wizard: ["wizard"],
}

// chestEvery strategy: every 2 puzzles for pp≥4; every pp puzzles for pp<4 (1 chest)
export const chestEveryFor = (pp: number): number => (pp >= 4 ? 2 : pp)

export const chestCountFor = (pp: number): number => {
  const ce = chestEveryFor(pp)
  let count = 0
  for (let p = 1; p <= pp; p++) if (p % ce === 0) count++
  return count
}
