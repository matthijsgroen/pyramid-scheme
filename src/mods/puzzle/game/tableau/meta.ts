import type { FamilyMeta } from "@/game/families/familyMeta"
import { resolveTableauKeyRequirements } from "./keyRequirements"

export const TABLEAU_META: FamilyMeta = {
  id: "tableau",
  ownerMod: "puzzle",
  tags: ["tomb-puzzle"],
  icon: "📜",
  color: "amber",
  rewardWeight: 8,
  resolveKeyRequirements: resolveTableauKeyRequirements,
}
