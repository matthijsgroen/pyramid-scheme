import type { FamilyMeta } from "@/game/families/familyMeta"

export const BALANCE_META: FamilyMeta = {
  id: "balance-scale",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  // Debuts at T1 (PUZZLE_FAMILIES.md §4.2), and its own starter board is two glyphs on two scales with
  // a number to share out, so it enters at the bottom of its own scale wherever the allocator drops
  // it (P4).
  minTier: "starter",
  icon: "⚖️",
  color: "purple",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
