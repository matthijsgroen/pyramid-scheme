import type { FamilyMeta } from "@/game/families/familyMeta"

export const CROCODILE_META: FamilyMeta = {
  id: "crocodile",
  ownerMod: "puzzle",
  // Its own "capstone" role — a main-path finale, never drawn into the general "tomb-puzzle"
  // pool alongside tableau. A tomb floor's last puzzle is authored with the "capstone" role.
  tags: ["capstone"],
  minTier: "junior", // starter tombs have no crocodile capstone
  icon: "🐊",
  color: "green",
  rewardPriority: 0, // the tomb's treasure follows directly after — that's its payoff, not this pool
}
