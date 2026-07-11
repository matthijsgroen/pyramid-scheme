import type { FamilyMeta } from "@/game/families/familyMeta"
import { resolveTableauKeyRequirements } from "./keyRequirements"

export const TABLEAU_META: FamilyMeta = {
  id: "tableau",
  ownerMod: "puzzle",
  tags: ["tomb-puzzle"],
  icon: "📜",
  color: "amber",
  rewardWeight: 0, // its own reward is the hieroglyph fragment, via the placement worklist — not this pool
  resolveKeyRequirements: resolveTableauKeyRequirements,
}
