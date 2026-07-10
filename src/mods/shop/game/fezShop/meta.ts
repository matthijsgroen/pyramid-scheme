import type { FamilyMeta } from "@/game/families/familyMeta"

export const FEZ_SHOP_META: FamilyMeta = {
  id: "fez-shop",
  ownerMod: "shop",
  tags: ["shop"],
  icon: "🛒",
  color: "amber",
  rewardWeight: 0, // browsed, not solved — never a puzzle-solve reward candidate
}
