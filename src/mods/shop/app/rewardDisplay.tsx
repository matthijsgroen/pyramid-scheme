import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays } from "@/app/SiteMap/rewardDisplayRegistry"
import { getSellableById } from "@/data/sellables"
import type { MaterialTier } from "@/data/treasures"

// Junk material tier → loot rarity for the reward popup.
const SELLABLE_RARITY: Record<MaterialTier, "common" | "rare" | "legendary"> = {
  stone: "common",
  bronze: "common",
  silver: "rare",
  gold: "rare",
  divine: "legendary",
}

// The money + sellable rewards' synchronous popup text/emoji (the generic RewardFlow fallback +
// the shop stock list), plus the sellable's rich display (tier-based rarity + its own symbol).
// Money uses the generic icon path, so it needs no display registration. The claim EFFECTS are
// shop's reward contribution (see ./index).
export const registerShopRewardDisplay = () => {
  registerRewardHandler({
    type: "money",
    emoji: "🪙",
    text: (reward, t) => ({ itemName: t("chest.money", { amount: reward.amount }), icon: "🪙" }),
  })
  registerRewardHandler({
    type: "sellable",
    emoji: "🔷", // no dedicated icon; text().icon below uses the item's own symbol
    text: (reward, t) => {
      const item = getSellableById(reward.itemId)
      return {
        itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : reward.itemId,
        itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
        icon: item?.symbol ?? "🔷",
      }
    },
  })

  registerRewardDisplays(() => ({
    sellable: (reward, t) => {
      if (reward.type !== "sellable") return { itemName: "", ItemVisual: null }
      const item = getSellableById(reward.itemId)
      return {
        rarity: item ? SELLABLE_RARITY[item.tier] : "common",
        itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : reward.itemId,
        itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
        ItemVisual: <span className="text-6xl">{item?.symbol ?? "🔷"}</span>,
      }
    },
  }))
}
