// Single source of truth for journey structure (id, tier, levelCount).
// Imported by both src/data/journeys.ts and scripts/worldGen/data.ts.
// No framework or game-engine imports allowed here.

export type JourneyTier = "starter" | "junior" | "expert" | "master" | "wizard"

export type PyramidStructure = { id: string; tier: JourneyTier; levelCount: number }
export type TombStructure = { id: string; tier: JourneyTier; levelCount: number }

export const PYRAMID_STRUCTURES: PyramidStructure[] = [
  // Starter
  { id: "starter_1", tier: "starter", levelCount: 3 },
  { id: "starter_2", tier: "starter", levelCount: 4 },
  { id: "starter_3", tier: "starter", levelCount: 5 },
  { id: "starter_4", tier: "starter", levelCount: 5 },
  // Junior
  { id: "junior_1", tier: "junior", levelCount: 3 },
  { id: "junior_2", tier: "junior", levelCount: 6 },
  { id: "junior_3", tier: "junior", levelCount: 8 },
  { id: "junior_4", tier: "junior", levelCount: 5 },
  // Expert
  { id: "expert_1", tier: "expert", levelCount: 4 },
  { id: "expert_2", tier: "expert", levelCount: 6 },
  { id: "expert_3", tier: "expert", levelCount: 9 },
  { id: "expert_4", tier: "expert", levelCount: 7 },
  // Master
  { id: "master_1", tier: "master", levelCount: 4 },
  { id: "master_2", tier: "master", levelCount: 9 },
  { id: "master_3", tier: "master", levelCount: 8 },
  { id: "master_4", tier: "master", levelCount: 5 },
  // Wizard
  { id: "wizard_1", tier: "wizard", levelCount: 9 },
  { id: "wizard_2", tier: "wizard", levelCount: 11 },
  { id: "wizard_3", tier: "wizard", levelCount: 10 },
  { id: "wizard_4", tier: "wizard", levelCount: 8 },
]

export const TOMB_STRUCTURES: TombStructure[] = [
  { id: "starter_treasure_tomb", tier: "starter", levelCount: 2 },
  { id: "junior_treasure_tomb", tier: "junior", levelCount: 3 },
  { id: "expert_treasure_tomb", tier: "expert", levelCount: 4 },
  { id: "expert_treasure_tomb_b", tier: "expert", levelCount: 4 },
  { id: "master_treasure_tomb", tier: "master", levelCount: 5 },
  { id: "master_treasure_tomb_b", tier: "master", levelCount: 5 },
  { id: "wizard_treasure_tomb", tier: "wizard", levelCount: 6 },
  { id: "wizard_treasure_tomb_b", tier: "wizard", levelCount: 6 },
  { id: "wizard_treasure_tomb_c", tier: "wizard", levelCount: 6 },
]
