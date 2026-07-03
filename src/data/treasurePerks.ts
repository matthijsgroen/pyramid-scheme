// Encoded from pyramid-interior-design.md §14 perk table.
// Each ID is "<tomb>_<floor>" matching the tomb journey IDs in TOMB_STRUCTURES.
// Perks accumulate permanently; "none" means the treasure is a pure ward/location key.

export type TreasurePerk =
  | { type: "none" }
  | { type: "tier-unlock"; tier: "junior" | "expert" | "master" | "wizard" }
  | { type: "location-key"; tombId: string }
  | { type: "compass"; level: 1 | 2 | 3 }
  | { type: "pack-mule" }
  | { type: "max-health" }
  | { type: "trap-insight" }
  | { type: "armor" }
  | { type: "consumable-detector"; level: 1 | 2 | 3 }
  | { type: "scribes-eye"; level: 1 | 2 | 3 }
  | { type: "detection"; level: 1 | 2 | 3 | 4 }

export const TREASURE_PERKS: Record<string, TreasurePerk> = {
  // Starter A (4 floors)
  starter_a_1: { type: "tier-unlock", tier: "junior" },
  starter_a_2: { type: "compass", level: 1 },
  starter_a_3: { type: "pack-mule" },
  starter_a_4: { type: "max-health" },

  // Junior A (6 floors)
  junior_a_1: { type: "tier-unlock", tier: "expert" },
  junior_a_2: { type: "none" },
  junior_a_3: { type: "none" },
  junior_a_4: { type: "none" },
  junior_a_5: { type: "max-health" },
  junior_a_6: { type: "max-health" },

  // Expert A (4 floors)
  expert_a_1: { type: "tier-unlock", tier: "master" },
  expert_a_2: { type: "location-key", tombId: "expert_treasure_tomb_b" },
  expert_a_3: { type: "trap-insight" },
  expert_a_4: { type: "armor" },

  // Expert B (4 floors)
  expert_b_1: { type: "consumable-detector", level: 1 },
  expert_b_2: { type: "none" },
  expert_b_3: { type: "trap-insight" },
  expert_b_4: { type: "max-health" },

  // Master A (5 floors)
  master_a_1: { type: "tier-unlock", tier: "wizard" },
  master_a_2: { type: "location-key", tombId: "master_treasure_tomb_b" },
  master_a_3: { type: "none" },
  master_a_4: { type: "compass", level: 2 },
  master_a_5: { type: "armor" },

  // Master B (5 floors)
  master_b_1: { type: "consumable-detector", level: 2 },
  master_b_2: { type: "scribes-eye", level: 1 },
  master_b_3: { type: "compass", level: 3 },
  master_b_4: { type: "max-health" },
  master_b_5: { type: "detection", level: 1 },

  // Wizard A (4 floors)
  wizard_a_1: { type: "none" },
  wizard_a_2: { type: "location-key", tombId: "wizard_treasure_tomb_b" },
  wizard_a_3: { type: "detection", level: 2 },
  wizard_a_4: { type: "none" },

  // Wizard B (4 floors)
  wizard_b_1: { type: "consumable-detector", level: 3 },
  wizard_b_2: { type: "location-key", tombId: "wizard_treasure_tomb_c" },
  wizard_b_3: { type: "detection", level: 3 },
  wizard_b_4: { type: "scribes-eye", level: 2 },

  // Wizard C (4 floors)
  wizard_c_1: { type: "none" },
  wizard_c_2: { type: "scribes-eye", level: 3 },
  wizard_c_3: { type: "max-health" },
  wizard_c_4: { type: "detection", level: 4 },
}

// Maps tomb journey ID → ordered array of perk IDs (one per floor)
export const TOMB_PERK_IDS: Record<string, string[]> = {
  starter_treasure_tomb: ["starter_a_1", "starter_a_2", "starter_a_3", "starter_a_4"],
  junior_treasure_tomb: ["junior_a_1", "junior_a_2", "junior_a_3", "junior_a_4", "junior_a_5", "junior_a_6"],
  expert_treasure_tomb: ["expert_a_1", "expert_a_2", "expert_a_3", "expert_a_4"],
  expert_treasure_tomb_b: ["expert_b_1", "expert_b_2", "expert_b_3", "expert_b_4"],
  master_treasure_tomb: ["master_a_1", "master_a_2", "master_a_3", "master_a_4", "master_a_5"],
  master_treasure_tomb_b: ["master_b_1", "master_b_2", "master_b_3", "master_b_4", "master_b_5"],
  wizard_treasure_tomb: ["wizard_a_1", "wizard_a_2", "wizard_a_3", "wizard_a_4"],
  wizard_treasure_tomb_b: ["wizard_b_1", "wizard_b_2", "wizard_b_3", "wizard_b_4"],
  wizard_treasure_tomb_c: ["wizard_c_1", "wizard_c_2", "wizard_c_3", "wizard_c_4"],
}

// Ward key IDs: the treasure that unlocks gated pyramid sections for the next tier.
// Junior pyramids → starter_a_1 ("Unlocks junior difficulty")
// Expert pyramids → junior_a_1, etc.
export const TIER_UNLOCK_PERK_ID: Partial<Record<string, string>> = {
  junior: "starter_a_1",
  expert: "junior_a_1",
  master: "expert_a_1",
  wizard: "master_a_1",
}
