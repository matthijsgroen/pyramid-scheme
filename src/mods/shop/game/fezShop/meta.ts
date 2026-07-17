import type { FamilyMeta } from "@/game/families/familyMeta"

export const FEZ_SHOP_META: FamilyMeta = {
  id: "fez-shop",
  ownerMod: "shop",
  tags: ["shop"],
  icon: "🛒",
  color: "amber",
  rewardPriority: 0, // browsed, not solved — never a reward candidate the priority passes fill
  rewardCapacity: 6, // a shop node exposes 6 stock slots (its `rewards[]`), filled by the mods
}
