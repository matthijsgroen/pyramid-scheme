import { useCallback } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"
import { getRewardHandler } from "./rewardHandlerRegistry"
import "./registerRewardHandlers"

type InventoryAPI = { addItem: (id: string, count: number) => void }

// The one seam for "apply this reward to game state" — shared by the treasure-room claim
// flow, puzzle-solve rewards, and the shop's rare-item purchase in SiteMapScreen.tsx. Kept
// separate from the surrounding pack-full/dedup/payment checks, which differ per entry point.
export const useApplyReward = (progression: ProgressionAPI, inventory: InventoryAPI, journeyId: string) =>
  useCallback(
    (reward: TreasureReward) => {
      getRewardHandler(reward.type)?.apply(reward, { progression, inventory, journeyId })
    },
    [progression, journeyId, inventory]
  )
