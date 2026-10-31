import { useProgression } from "@/app/state/useProgression"
import { MOSAIC_TIERS, mosaicBucket } from "../game/mosaicCurrency"
import { carriedPieces, type TierCounts } from "../game/placementQueue"
import { useMosaicProgress } from "./useMosaicProgress"
import { useMosaicReminder } from "./useMosaicReminder"

// Coming back to the camp is where a return is counted, with the window open or not.
export const useMosaicHomeReminder = () => {
  const { ledger, loaded: ledgerLoaded } = useProgression()
  const { placedCount, loaded: placedLoaded } = useMosaicProgress()
  const owned = Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as TierCounts
  const placed = Object.fromEntries(MOSAIC_TIERS.map(t => [t, placedCount(t)])) as TierCounts
  useMosaicReminder({
    unplaced: carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0),
    ready: ledgerLoaded && placedLoaded,
  })
}
