import type { FamilyMeta } from "@/game/families/familyMeta"

export const LIGHTBEAM_META: FamilyMeta = {
  id: "lightbeam",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  // Configured for every tier (docs/game-design/puzzles/lightbeam.md §6), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  minTier: "starter",
  icon: "🔆",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
