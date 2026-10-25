import { registerRewardHandler, type RewardText, type TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays, type RewardDisplay } from "@/app/SiteMap/rewardDisplayRegistry"
import type { TreasureReward } from "@/game/siteTypes"
import { getSellableById } from "@/data/sellables"
import { sellableArt } from "./sellableArt"
import { moneyRewardSchema, purchaseRewardSchema, sellableRewardSchema } from "@/mods/shop/game/rewardSchemas"
import type { MaterialTier } from "@/data/materialTiers"

// Junk material tier → loot rarity for the reward popup.
const SELLABLE_RARITY: Record<MaterialTier, "common" | "rare" | "legendary"> = {
  stone: "common",
  bronze: "common",
  silver: "rare",
  gold: "rare",
  divine: "legendary",
}

// What stands for a purchase until it is painted.
const PURCHASE_EMOJI: Record<string, string> = {
  donkey: "🫏",
  secondDonkey: "🫏",
  camel: "🐪",
  secondCamel: "🐪",
  cart: "🛞",
  sturdyCart: "🛞",
  caravanBanner: "🚩",
}
const purchaseEmoji = (id: string): string => PURCHASE_EMOJI[id] ?? "🛞"

// A purchase in Fez's list: its name, and what it opens.
export const purchaseText = (reward: TreasureReward, t: TFn): RewardText => {
  const { id } = purchaseRewardSchema.parse(reward)
  return {
    itemName: t(`purchases.${id}.name`, { defaultValue: id }),
    itemDescription: t(`purchases.${id}.opens`, { defaultValue: "" }) || undefined,
    icon: purchaseEmoji(id),
  }
}

// The popup once bought: what it opens, set apart as the effect gained.
export const purchaseDisplay = (reward: TreasureReward, t: TFn): RewardDisplay => {
  const { itemName, itemDescription, icon } = purchaseText(reward, t)
  return {
    rarity: "epic",
    itemName,
    itemEffectDescription: itemDescription,
    ItemVisual: <span className="text-6xl">{icon}</span>,
  }
}

// The money, sellable and purchase rewards' synchronous popup text/emoji (the generic RewardFlow fallback +
// the shop stock list), plus the sellable's and purchase's rich displays.
// Money uses the generic icon path, so it needs no display registration. The claim EFFECTS are
// shop's reward contribution (see ./index).
export const registerShopRewardDisplay = () => {
  registerRewardHandler({
    type: "money",
    emoji: "🪙",
    text: (reward, t) => ({
      // `count` (not `amount`) — i18next only picks chest.money_one/_other from an option by that name
      itemName: t("chest.money", { count: moneyRewardSchema.parse(reward).amount }),
      icon: "🪙",
    }),
  })
  registerRewardHandler({
    type: "sellable",
    emoji: "🔷", // no dedicated icon; text().icon below uses the item's own symbol
    text: (reward, t) => {
      const { itemId } = sellableRewardSchema.parse(reward)
      const item = getSellableById(itemId)
      return {
        itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : itemId,
        itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
        icon: item?.symbol ?? "🔷",
      }
    },
  })

  registerRewardHandler({ type: "purchase", emoji: "🫏", text: purchaseText })

  registerRewardDisplays(() => ({
    purchase: purchaseDisplay,
    sellable: (reward, t) => {
      const { itemId } = sellableRewardSchema.parse(reward)
      const item = getSellableById(itemId)
      return {
        rarity: item ? SELLABLE_RARITY[item.tier] : "common",
        itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : itemId,
        itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
        ItemVisual: (() => {
          const art = item && sellableArt(item.id)
          return art ? (
            <img src={art} alt="" draggable={false} className="size-24 object-contain" />
          ) : (
            <span className="text-6xl">{item?.symbol ?? "🔷"}</span>
          )
        })(),
      }
    },
  }))
}
