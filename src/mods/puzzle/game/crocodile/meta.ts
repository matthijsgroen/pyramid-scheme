import type { FamilyMeta } from "@/game/families/familyMeta"

export const CROCODILE_META: FamilyMeta = {
  id: "crocodile",
  ownerMod: "puzzle",
  tags: ["tomb-puzzle"],
  icon: "🐊",
  color: "green",
  rewardWeight: 0, // the tomb's treasure follows directly after — that's its payoff, not this pool
}
