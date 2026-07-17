import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"

export type TFn = (key: string, opts?: Record<string, unknown>) => string
export type RewardText = { itemName: string; itemDescription?: string; icon: string }

type InventoryAPI = { addItem: (id: string, count: number) => void }
type ApplyCtx = { progression: ProgressionAPI; inventory: InventoryAPI; journeyId: string }

export type RewardHandler<R extends TreasureReward = TreasureReward> = {
  type: R["type"]
  // The state write for a claim that only touches CORE state (progression/inventory). Reward
  // types whose effect needs a mod's own state (e.g. a consumable → trap) omit this and register
  // a reward contribution instead (rewardContributions.ts); a handler is then display-only.
  apply?: (reward: R, ctx: ApplyCtx) => void
  emoji: string
  text: (reward: R, t: TFn) => RewardText
}

const registry = new Map<string, RewardHandler>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerRewardHandler = (handler: RewardHandler<any>) => registry.set(handler.type, handler)

export const getRewardHandler = (type: string): RewardHandler | undefined => registry.get(type)
