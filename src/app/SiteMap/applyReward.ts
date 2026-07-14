import { useCallback } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"
import { getRewardHandler } from "./rewardHandlerRegistry"
import { useMergedRewardContributions } from "./rewardContributions"
import "./registerRewardHandlers"

type InventoryAPI = { addItem: (id: string, count: number) => void }

// The one seam for "apply this reward to game state" — shared by the treasure-room claim
// flow, puzzle-solve rewards, and the shop's rare-item purchase in SiteMapScreen.tsx. Kept
// separate from the surrounding pack-full/dedup/payment checks, which differ per entry point.
// A claim runs the core handler's `apply` (progression/inventory) plus any mod's reward effect
// (rewardContributions.ts) — so a consumable's addConsumable happens without core knowing trap.
export const useApplyReward = (progression: ProgressionAPI, inventory: InventoryAPI, journeyId: string) => {
  const { effects } = useMergedRewardContributions()
  return useCallback(
    (reward: TreasureReward) => {
      getRewardHandler(reward.type)?.apply?.(reward, { progression, inventory, journeyId })
      effects[reward.type]?.(reward, { journeyId })
    },
    [progression, journeyId, inventory, effects]
  )
}
