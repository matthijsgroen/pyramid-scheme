import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import { hasStandingStructure } from "@/mods/camp/game/campState"
import { useCampProgress } from "./useCampProgress"

// What the camp says about the home: something has been found, a structure stands. Read through the camp's
// save reader, so a save this build cannot read says nothing.
export const useCampHomeTags = (table: CampStepTable = CAMP_STEPS): string[] => {
  const { save } = useCampProgress(table)
  const tags: string[] = []
  if (save.finds.length > 0) tags.push("camp.found")
  if (hasStandingStructure(save, table)) tags.push("camp.structureDone")
  return tags
}
