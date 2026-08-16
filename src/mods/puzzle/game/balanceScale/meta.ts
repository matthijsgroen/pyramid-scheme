import type { FamilyMeta } from "@/game/families/familyMeta"

// Not yet listed in the puzzle mod's `families` (src/mods/puzzle/index.ts), so world-gen cannot
// allocate it: the family is playable in the puzzle lab only until its boards are approved for
// authoring. Adding it there is the single edit that puts it in the world.
export const BALANCE_META: FamilyMeta = {
  id: "balance-scale",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  minTier: "starter",
  icon: "⚖️",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
