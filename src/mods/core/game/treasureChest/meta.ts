import type { FamilyMeta } from "@/game/families/familyMeta"

export const TREASURE_CHEST_META: FamilyMeta = {
  id: "treasure-chest",
  ownerMod: "core",
  tags: ["treasure"],
  icon: "🪙",
  color: "amber",
  rewardWeight: 0, // already carries its own authored reward directly
}
