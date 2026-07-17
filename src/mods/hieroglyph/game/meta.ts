import type { FamilyMeta } from "@/game/families/familyMeta"
import { resolveTableauKeyRequirements } from "./keyRequirements"

export const TABLEAU_META: FamilyMeta = {
  id: "tableau",
  ownerMod: "tableau",
  tags: ["tomb-puzzle"],
  minTier: "starter",
  icon: "📜",
  color: "amber",
  rewardPriority: 0, // its own reward is the hieroglyph fragment, via the placement worklist — not this pool
  resolveKeyRequirements: resolveTableauKeyRequirements,
}
