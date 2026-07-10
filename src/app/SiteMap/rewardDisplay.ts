import type { TreasureReward, ConsumableType } from "@/game/siteTypes"
import { getRewardHandler, CONSUMABLE_EMOJI, type TFn, type RewardText } from "./rewardHandlerRegistry"
import "./registerRewardHandlers"

export type { TFn, RewardText } from "./rewardHandlerRegistry"

export const rewardEmoji = (type: string): string =>
  getRewardHandler(type)?.emoji ?? CONSUMABLE_EMOJI[type as ConsumableType] ?? "🔷"

export const rewardText = (
  reward: TreasureReward,
  t: TFn,
  hieroglyphProgress?: (id: string) => { found: number; required: number }
): RewardText => {
  const handler = getRewardHandler(reward.type)
  if (handler) return handler.text(reward, t, hieroglyphProgress)
  return {
    itemName: t(`chest.${reward.type}`),
    itemDescription: t(`chest.${reward.type}Description`, { defaultValue: "" }) || undefined,
    icon: rewardEmoji(reward.type),
  }
}
