import type { TreasureReward } from "@/game/siteTypes"
import { getRewardHandler, type TFn, type RewardText } from "./rewardHandlerRegistry"
import "./registerRewardHandlers"

export type { TFn, RewardText } from "./rewardHandlerRegistry"

// Synchronous emoji/text for a reward, from its registered handler (core's tomb-treasure handlers
// plus whatever each enabled mod registers). Used by the shop stock list and RewardFlow's generic
// fallback. A type with no handler falls back to a neutral icon + a `chest.<type>` label.
export const rewardEmoji = (type: string): string => getRewardHandler(type)?.emoji ?? "🔷"

export const rewardText = (reward: TreasureReward, t: TFn): RewardText => {
  const handler = getRewardHandler(reward.type)
  if (handler) return handler.text(reward, t)
  return {
    itemName: t(`chest.${reward.type}`),
    itemDescription: t(`chest.${reward.type}Description`, { defaultValue: "" }) || undefined,
    icon: rewardEmoji(reward.type),
  }
}
