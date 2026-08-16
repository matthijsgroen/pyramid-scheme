import type { FamilyMeta } from "@/game/families/familyMeta"

export const FUTOSHIKI_META: FamilyMeta = {
  id: "futoshiki",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  minTier: "starter",
  icon: "⚖️",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
