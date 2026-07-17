// The perk each tomb treasure grants (its gameplay meaning). Owned by the tomb-treasure mod:
// core world-gen carries only the structural keyId ordering (TOMB_PERK_IDS/TIER_UNLOCK_PERK_ID in
// @/data/treasurePerks). Encoded from pyramid-interior-design.md §14. keyId = "<tomb>_<floor>".
// "none" means the treasure is a pure ward/location key (no accumulating perk).

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
