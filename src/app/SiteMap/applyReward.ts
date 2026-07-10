import { useCallback } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"

type InventoryAPI = { addItem: (id: string, count: number) => void }

// The one seam for "apply this reward to game state" — shared by the treasure-room claim
// flow, puzzle-solve rewards, and the shop's rare-item purchase in SiteMapScreen.tsx. Kept
// separate from the surrounding pack-full/dedup/payment checks, which differ per entry point.
export const useApplyReward = (progression: ProgressionAPI, inventory: InventoryAPI, journeyId: string) =>
  useCallback(
    (reward: TreasureReward) => {
      if (reward.type === "hieroglyphFragment") progression.addFragment(reward.hieroglyphId, reward.pieceIndex)
      else if (reward.type === "mapPiece") {
        progression.collectMapPiece(reward.tombId)
        progression.markMapPieceFound(journeyId)
      } else if (reward.type === "tombKey") {
        progression.addTombKey(reward.keyId)
        progression.applyTreasurePerk(reward.keyId)
      } else if (reward.type === "mosaicPiece") progression.collectMosaicPiece()
      else if (reward.type === "consumable") progression.addConsumable(reward.consumable)
      else if (reward.type === "money") progression.addMoney(reward.amount)
      else if (reward.type === "sellable") inventory.addItem(reward.itemId, 1)
    },
    [progression, journeyId, inventory]
  )
