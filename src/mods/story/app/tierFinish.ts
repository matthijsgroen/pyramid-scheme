import { useCallback } from "react"
import { registerTierFinish, type TierFinished } from "@/app/dev/tierFinishContributions"
import { DEV_TOOLS } from "@/app/dev/devToolsBuild"
import { useMarkHeard } from "@/app/fez/useMarkHeard"
import { isModEnabled } from "@/mods/registeredMods"
import { beatsHeardFinishing } from "../game/tierBeats"

/** The story's part of a finished tier: its beats written down heard, as the player who finished it heard them. */
export const useStoryTierFinish = () => {
  const markHeard = useMarkHeard()
  return useCallback(
    ({ tier, floors, claimed }: TierFinished) => {
      const journeyIds = [...new Set(floors.map(f => f.journeyId))]
      const hiddenCorridor = floors.some(f =>
        f.grid.cells.some(row => row.some(cell => cell.type !== "empty" && cell.hidden))
      )
      const campFind = claimed.some(reward => reward.type === "campFind")
      void markHeard(beatsHeardFinishing(tier, journeyIds, { hiddenCorridor, campFind }))
    },
    [markHeard]
  )
}

if (DEV_TOOLS && isModEnabled("story")) registerTierFinish(useStoryTierFinish)
