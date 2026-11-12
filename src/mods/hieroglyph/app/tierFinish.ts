import { useCallback } from "react"
import { registerTierFinish, type TierFinished } from "@/app/dev/tierFinishContributions"
import { DEV_TOOLS } from "@/app/dev/devToolsBuild"
import { useMarkHeard } from "@/app/fez/useMarkHeard"
import { isModEnabled } from "@/mods/registeredMods"
import { TABLEAU_META } from "../game/meta"

/** The tableau's lesson, heard by whoever solved a tier with a tableau on its floors. */
export const useHieroglyphTierFinish = () => {
  const markHeard = useMarkHeard()
  return useCallback(
    ({ floors }: TierFinished) => {
      const tableau = floors.some(f =>
        f.grid.cells.some(row => row.some(cell => cell.type === "room" && cell.family === TABLEAU_META.id))
      )
      if (tableau) void markHeard(["tombTutorial"])
    },
    [markHeard]
  )
}

if (DEV_TOOLS && isModEnabled("hieroglyph")) registerTierFinish(useHieroglyphTierFinish)
