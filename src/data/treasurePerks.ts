// Structural tomb ward-key ordering — the keyId identifiers world-gen wires ward gates from.
// Core carries only this structural layer; the perk each keyId GRANTS (its gameplay meaning) lives
// in the tomb-treasure mod (src/mods/tombTreasure/game/treasurePerks.ts). Each keyId is
// "<tomb>_<floor>" matching the tomb journey IDs in TOMB_STRUCTURES.

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

// Ward key IDs: the treasures that unlock gated pyramid sections for the next tier — one per
// journey of that tier (junior_1's ward gates open on keys[0], junior_2's on keys[1], etc.), all
// drawn from the previous tier's own tomb. Holding ANY one of a tier's keys unlocks entry to the
// whole tier (see isTierUnlocked); each specific key additionally opens its own paired journey's
// ward-gated bonus content, so finding more of them progressively unlocks more exploration instead
// of the whole tier opening at once off a single shared key.
export const TIER_UNLOCK_PERK_IDS: Partial<Record<string, string[]>> = {
  junior: ["starter_a_1", "starter_a_2", "starter_a_3", "starter_a_4"],
  expert: ["junior_a_1", "junior_a_2", "junior_a_3", "junior_a_4"],
  master: ["expert_a_1", "expert_a_2", "expert_a_3", "expert_a_4"],
  wizard: ["master_a_1", "master_a_2", "master_a_3", "master_a_4"],
}
