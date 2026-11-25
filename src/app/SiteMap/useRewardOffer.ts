import { useCallback, useState } from "react"
import type { KeyColor, TreasureReward } from "@/game/siteTypes"
import { playSound } from "@/app/audio/audio"
import { rewardSound } from "@/app/audio/coreSounds"
import { LOOT_BURST_MS } from "@/ui/atoms/LootPopup"
import type { MergedRewardContributions } from "./rewardContributions"

export type PendingReward = {
  reward: TreasureReward
  keyColors?: readonly KeyColor[]
  /** Handed over by somebody rather than found: the popup says so. */
  received?: boolean
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
      // Heard as the card comes in, not over the burst before it.
      playSound(rewardSound(reward.type), { delay: LOOT_BURST_MS / 1000 })
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
