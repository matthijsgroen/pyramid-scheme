import type { Mark } from "@/game/mark"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"

export type TFn = (key: string, opts?: Record<string, unknown>) => string
export type RewardText = { itemName: string; itemDescription?: string; icon: string }

type InventoryAPI = { addItem: (id: string, count: number) => void }
type ApplyCtx = { progression: ProgressionAPI; inventory: InventoryAPI; journeyId: string }

/** The three pieces of a lever's drawing, by default-tier tile key (`nodeArt.ts`, `armStack`). */
export type LeverTiles = { back: string; arm: string; front: string }

/**
 * HOW A REWARD STANDS IN ITS ROOM when it is not the chest: a prop drawn in the chest's place, or a lever whose arm
 * is down once the reward is taken. `stand` is what draws while the painting named first is owed, so the
 * placement can be judged before the art exists; a tile of the first name that gets painted takes over unchanged.
 * `mark` is the mark it wears, matched against the doors it opens.
 */
export type RewardArt = { mark?: Mark } & (
  { kind: "prop"; tile: string; stand: string } | { kind: "lever"; tiles: LeverTiles; stand: LeverTiles }
)

export type RewardHandler<R extends TreasureReward = TreasureReward> = {
  type: R["type"]
  /** Drawn in the room in place of the chest, where the reward is not a chest's. Absent: the chest. */
  art?: (reward: R) => RewardArt | undefined
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
