import type { HomeTagsReading } from "@/app/home/homeTags"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import { arrivedPurchases, arrivedTag, hasStandingStructure } from "@/mods/camp/game/campState"
import { useCampProgress } from "./useCampProgress"

// What the camp says about the home: a structure stands, a purchase has come to stand in
// the camp. Read through the camp's
// save reader, so a save this build cannot read says nothing.
export const useCampHomeTags = (table: CampStepTable = CAMP_STEPS): HomeTagsReading => {
  const { save, loaded } = useCampProgress(table)
  const tags: string[] = []
  if (hasStandingStructure(save, table)) tags.push("camp.structureDone")
  for (const purchase of arrivedPurchases(save, table)) tags.push(arrivedTag(purchase))
  return { tags, loaded }
}
