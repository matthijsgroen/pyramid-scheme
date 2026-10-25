import { useCallback, useState } from "react"
import type { KeyColor, TreasureReward } from "@/game/siteTypes"
import type { MergedRewardContributions } from "./rewardContributions"

export type PendingReward = {
  reward: TreasureReward
  keyColors?: readonly KeyColor[]
  onCollect: () => void
}

export type RewardOffer = {
  /** The reward waiting on the player's acknowledgement; null while nothing is being offered. */
  pending: PendingReward | null
  /** A reward just won from an encounter. */
  offerFound: (reward: TreasureReward, keyColors?: readonly KeyColor[]) => void
  dismiss: () => void
}

type RewardOfferArgs = {
  rewardContributions: MergedRewardContributions
  applyReward: (reward: TreasureReward) => void
  /** Runs once, right after applyReward, for a reward the player collected from the popup. */
  onTaken?: (reward: TreasureReward) => void
}

// Whether a reward reaches the player, and what the popup says when it does. Core dispatches through
// the mod seams here and names no mod: a mod may silently ignore a reward (`skip` — nothing to do,
// e.g. an already-collected hieroglyph fragment: no popup, no side effect, not remembered); every
// other reward is offered and taken.
export const useRewardOffer = ({ rewardContributions, applyReward, onTaken }: RewardOfferArgs): RewardOffer => {
  const [pending, setPending] = useState<PendingReward | null>(null)

  const offerFound = useCallback(
    (reward: TreasureReward, keyColors?: readonly KeyColor[]) => {
      if (rewardContributions.skip(reward)) return
      setPending({
        reward,
        keyColors,
        onCollect: () => {
          applyReward(reward)
          onTaken?.(reward)
        },
      })
    },
    [rewardContributions, applyReward, onTaken]
  )

  const dismiss = useCallback(() => {
    if (pending) rewardContributions.seen[pending.reward.type]?.(pending.reward)
    setPending(null)
  }, [pending, rewardContributions])

  return { pending, offerFound, dismiss }
}
