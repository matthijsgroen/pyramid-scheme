import { useCallback } from "react"
import { registerTierFinish, type TierFinished } from "@/app/dev/tierFinishContributions"
import { DEV_TOOLS } from "@/app/dev/devToolsBuild"
import { useMarkHeard } from "@/app/fez/useMarkHeard"
import { isModEnabled } from "@/mods/registeredMods"

/** Fez's word on a map piece and on a whole map, heard by whoever picked a tier's pieces up. */
export const useTombTreasureTierFinish = () => {
  const markHeard = useMarkHeard()
  return useCallback(
    ({ claimed }: TierFinished) => {
      if (claimed.some(reward => reward.type === "mapPiece")) void markHeard(["mapPiece", "mapComplete"])
    },
    [markHeard]
  )
}

if (DEV_TOOLS && isModEnabled("tomb-treasure")) registerTierFinish(useTombTreasureTierFinish)
