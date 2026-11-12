import { useCallback } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"
import { getRewardHandler } from "./rewardHandlerRegistry"
import { useMergedRewardContributions, type MergedRewardContributions } from "./rewardContributions"
import "./registerRewardHandlers"

type InventoryAPI = { addItem: (id: string, count: number) => void }

const apply = (
  reward: TreasureReward,
  journeyId: string,
  {
    progression,
    inventory,
    effects,
  }: { progression: ProgressionAPI; inventory: InventoryAPI } & Pick<MergedRewardContributions, "effects">
) => {
  getRewardHandler(reward.type)?.apply?.(reward, { progression, inventory, journeyId })
  effects[reward.type]?.(reward, { journeyId })
}

// The one seam for "apply this reward to game state" — shared by the treasure-room claim
// flow, puzzle-solve rewards, and the shop's rare-item purchase in SiteMapScreen.tsx. Kept
// separate from the surrounding dedup/payment checks, which differ per entry point.
// A claim runs the core handler's `apply` (progression/inventory) plus any mod's reward effect
// (rewardContributions.ts) — so a mod's own state write happens without core knowing the mod.
export const useApplyReward = (progression: ProgressionAPI, inventory: InventoryAPI, journeyId: string) => {
  const { effects } = useMergedRewardContributions()
  return useCallback(
    (reward: TreasureReward) => apply(reward, journeyId, { progression, inventory, effects }),
    [progression, journeyId, inventory, effects]
  )
}

/** The same claim for a reward of any journey, without the popup: false when a mod skips it, as the popup does. */
export const useClaimSilently = (progression: ProgressionAPI, inventory: InventoryAPI) => {
  const { effects, skip } = useMergedRewardContributions()
  return useCallback(
    (reward: TreasureReward, journeyId: string): boolean => {
      if (skip(reward)) return false
      apply(reward, journeyId, { progression, inventory, effects })
      return true
    },
    [progression, inventory, effects, skip]
  )
}
