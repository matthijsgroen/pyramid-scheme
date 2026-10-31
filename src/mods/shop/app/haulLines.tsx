import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import type { HaulLine } from "@/app/home/haulLines"
import type { TreasureReward } from "@/game/siteTypes"
import { getSellableById } from "@/data/sellables"
import { moneyRewardSchema, sellableRewardSchema } from "@/mods/shop/game/rewardSchemas"
import { sellableArt } from "./sellableArt"

// Every coin brought home is one line, however many pickups it came from.
export const summariseCoins = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] => [
  {
    key: "money",
    visual: <span className="text-6xl">🪙</span>,
    title: t("shop.haul.coins", { count: rewards.reduce((sum, r) => sum + moneyRewardSchema.parse(r).amount, 0) }),
    note: t("shop.haul.note"),
  },
]

// One line per item, equal items merged with "×n".
export const summariseSellables = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] => {
  const counts = new Map<string, number>()
  for (const reward of rewards) {
    const { itemId } = sellableRewardSchema.parse(reward)
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
  }
  return [...counts].map(([itemId, count]) => {
    const item = getSellableById(itemId)
    const name = item ? t(`${item.id}.name`, { ns: "sellables" }) : itemId
    const art = item && sellableArt(item.id)
    return {
      key: `sellable-${itemId}`,
      visual: art ? (
        <img src={art} alt="" draggable={false} className="size-24 object-contain" />
      ) : (
        <span className="text-6xl">{item?.symbol ?? "🔷"}</span>
      ),
      title: count > 1 ? `${name} ${t("home.haul.times", { count })}` : name,
    }
  })
}

export const useShopHaulLines = () => ({ money: summariseCoins, sellable: summariseSellables })
