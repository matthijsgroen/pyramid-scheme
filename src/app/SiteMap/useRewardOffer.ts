import { useCallback, useState } from "react"
import type { KeyColor, TreasureReward } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { MergedRewardContributions } from "./rewardContributions"

export type PendingReward = {
  reward: TreasureReward
  consumableFull?: boolean
  keyColors?: readonly KeyColor[]
  onCollect: () => void
}

export type RewardOffer = {
  /** The reward waiting on the player's acknowledgement; null while nothing is being offered. */
  pending: PendingReward | null
  /** A reward just won from an encounter. */
  offerFound: (reward: TreasureReward, edgeId: string, keyColors?: readonly KeyColor[]) => void
  /** Re-offer of a consumable the player once left behind because their pack was full. */
  offerSkipped: (reward: TreasureReward, edgeId: string) => void
  dismiss: () => void
}

type RewardOfferArgs = {
  journeys: JourneyAPI
  rewardContributions: MergedRewardContributions
  applyReward: (reward: TreasureReward) => void
}

// Whether a reward reaches the player, and what the popup says when it does. Core dispatches through
// the mod seams here and names no mod: a mod may silently ignore a reward (`skip` — nothing to do,
// e.g. an already-collected hieroglyph fragment: no popup, no side effect, not remembered), or refuse
// it for now (`canAccept` — e.g. a full consumable pack: the come-back popup, and the skip is
// remembered so the chest can be reopened later).
export const useRewardOffer = ({ journeys, rewardContributions, applyReward }: RewardOfferArgs): RewardOffer => {
  const [pending, setPending] = useState<PendingReward | null>(null)

  const offerFound = useCallback(
    (reward: TreasureReward, edgeId: string, keyColors?: readonly KeyColor[]) => {
      if (rewardContributions.skip(reward)) return
      if (!rewardContributions.canAccept(reward)) {
        journeys.markConsumableSkipped(edgeId)
        setPending({ reward, consumableFull: true, onCollect: () => {} })
        return
      }
      setPending({ reward, keyColors, onCollect: () => applyReward(reward) })
    },
    [journeys, rewardContributions, applyReward]
  )

  const offerSkipped = useCallback(
    (reward: TreasureReward, edgeId: string) => {
      if (!rewardContributions.canAccept(reward)) {
        setPending({ reward, consumableFull: true, onCollect: () => {} })
        return
      }
      setPending({
        reward,
        onCollect: () => {
          applyReward(reward)
          journeys.clearConsumableSkipped(edgeId)
        },
      })
    },
    [journeys, rewardContributions, applyReward]
  )

  const dismiss = useCallback(() => setPending(null), [])

  return { pending, offerFound, offerSkipped, dismiss }
}
