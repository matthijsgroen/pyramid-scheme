import { useCallback } from "react"
import { registerTierFinish, type TierFinished } from "@/app/dev/tierFinishContributions"
import { DEV_TOOLS } from "@/app/dev/devToolsBuild"
import { useMarkHeard } from "@/app/fez/useMarkHeard"
import { useProgression } from "@/app/state/useProgression"
import { isModEnabled } from "@/mods/registeredMods"
import { MOSAIC_TIERS, mosaicBucket, type MosaicTier } from "../game/mosaicCurrency"
import { beatsEarnedBy, carriedPieces, type TierCounts } from "../game/placementQueue"
import { useMosaicProgress } from "./useMosaicProgress"
import { MOSAIC_INTRO } from "./useMosaicReminder"

const counts = (count: (tier: MosaicTier) => number) =>
  Object.fromEntries(MOSAIC_TIERS.map(t => [t, count(t)])) as TierCounts

/** The pieces the finish found set into the window, as a player does at camp, with what Fez says about it heard. */
export const useMosaicTierFinish = () => {
  const { ledger } = useProgression()
  const { placedCount, placeOne } = useMosaicProgress()
  const markHeard = useMarkHeard()
  return useCallback(
    ({ claimed }: TierFinished) => {
      const found = claimed.filter(reward => reward.type === "mosaicPiece")
      // The ledger has not seen this finish's pieces yet: they are counted from what it claimed.
      const owned = counts(t => ledger.get(mosaicBucket(t)) + found.filter(reward => reward.tier === t).length)
      const placed = counts(placedCount)
      const beats = found.length > 0 ? [MOSAIC_INTRO] : []
      for (const carried of carriedPieces(owned, placed)) {
        const { tier } = carried
        // Only what this finish found: pieces carried from elsewhere stay in hand.
        const count = Math.min(carried.count, found.filter(reward => reward.tier === tier).length)
        for (let i = 0; i < count; i++) void placeOne(tier)
        beats.push(...beatsEarnedBy(tier, { ...placed, [tier]: placed[tier] + count }))
      }
      if (beats.length > 0) void markHeard(beats)
    },
    [ledger, placedCount, placeOne, markHeard]
  )
}

if (DEV_TOOLS && isModEnabled("mosaic")) registerTierFinish(useMosaicTierFinish)
