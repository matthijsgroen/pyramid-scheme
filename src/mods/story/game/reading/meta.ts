import type { FamilyMeta } from "@/game/families/familyMeta"

// A wall with a sign cut wrong. Not a puzzle with a solution to find — the player either holds the
// sign that belongs there or does not — so it carries no reward and is never a reward candidate.
export const READING_META: FamilyMeta = {
  id: "reading",
  ownerMod: "story",
  tags: ["story"],
  icon: "𓍷",
  color: "stone",
  rewardPriority: 0,
}
