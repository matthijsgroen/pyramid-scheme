import type { JourneyDef, Tier } from "./types"

export const WORLD_SEED = 42_195_837

// Pyramid journey catalogue — matches journeys.ts tier/id + siteConfigs.ts pathPuzzles
// Must be kept in sync with levelCount in src/data/journeys.ts
export const PYRAMID_JOURNEYS: JourneyDef[] = [
  // Starter
  { id: "starter_1", tier: "starter", pathPuzzles: 2, levelCount: 3 },
  { id: "starter_2", tier: "starter", pathPuzzles: 2, levelCount: 4 },
  { id: "starter_3", tier: "starter", pathPuzzles: 3, levelCount: 5 },
  { id: "starter_4", tier: "starter", pathPuzzles: 3, levelCount: 5 },
  // Junior
  { id: "junior_1", tier: "junior", pathPuzzles: 3, levelCount: 3 },
  { id: "junior_2", tier: "junior", pathPuzzles: 4, levelCount: 6 },
  { id: "junior_3", tier: "junior", pathPuzzles: 5, levelCount: 8 },
  { id: "junior_4", tier: "junior", pathPuzzles: 4, levelCount: 5 },
  // Expert
  { id: "expert_1", tier: "expert", pathPuzzles: 4, levelCount: 4 },
  { id: "expert_2", tier: "expert", pathPuzzles: 5, levelCount: 6 },
  { id: "expert_3", tier: "expert", pathPuzzles: 6, levelCount: 9 },
  { id: "expert_4", tier: "expert", pathPuzzles: 5, levelCount: 7 },
  // Master
  { id: "master_1", tier: "master", pathPuzzles: 5, levelCount: 4 },
  { id: "master_2", tier: "master", pathPuzzles: 7, levelCount: 9 },
  { id: "master_3", tier: "master", pathPuzzles: 7, levelCount: 8 },
  { id: "master_4", tier: "master", pathPuzzles: 6, levelCount: 5 },
  // Wizard
  { id: "wizard_1", tier: "wizard", pathPuzzles: 8, levelCount: 9 },
  { id: "wizard_2", tier: "wizard", pathPuzzles: 8, levelCount: 11 },
  { id: "wizard_3", tier: "wizard", pathPuzzles: 8, levelCount: 10 },
  { id: "wizard_4", tier: "wizard", pathPuzzles: 8, levelCount: 8 },
]

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
