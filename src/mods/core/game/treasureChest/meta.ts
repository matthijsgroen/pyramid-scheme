import type { FamilyMeta } from "@/game/families/familyMeta"

export const TREASURE_CHEST_META: FamilyMeta = {
  id: "treasure-chest",
  ownerMod: "core",
  tags: ["treasure"],
  icon: "🪙",
  color: "amber",
  rewardPriority: 100, // treasure always has loot — fills first, guaranteed
}
