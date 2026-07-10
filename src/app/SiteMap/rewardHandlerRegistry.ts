import type { TreasureReward, ConsumableType } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"

export type TFn = (key: string, opts?: Record<string, unknown>) => string
export type RewardText = { itemName: string; itemDescription?: string; icon: string }

// Consumable subtypes aren't reward types, so they don't get a RewardHandler — this is the
// one place that maps them to an icon, shared by rewardEmoji's bare-string overload and the
// "consumable" reward handler's own display text.
export const CONSUMABLE_EMOJI: Record<ConsumableType, string> = { bandage: "🩹", oil: "🫙", trapTool: "🔧" }

type InventoryAPI = { addItem: (id: string, count: number) => void }
type ApplyCtx = { progression: ProgressionAPI; inventory: InventoryAPI; journeyId: string }

export type RewardHandler<R extends TreasureReward = TreasureReward> = {
  type: R["type"]
  apply: (reward: R, ctx: ApplyCtx) => void
  emoji: string
  text: (reward: R, t: TFn, hieroglyphProgress?: (id: string) => { found: number; required: number }) => RewardText
}

const registry = new Map<string, RewardHandler>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerRewardHandler = (handler: RewardHandler<any>) => registry.set(handler.type, handler)

export const getRewardHandler = (type: string): RewardHandler | undefined => registry.get(type)
