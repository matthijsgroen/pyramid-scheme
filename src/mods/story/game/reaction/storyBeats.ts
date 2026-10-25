import { TOMB_STRUCTURES } from "@/data/journeyStructure"

/**
 * Every beat the rail may play: the three of each tomb, the camp's, and the bond beats.
 *
 * A beat written but not listed here stays silent, which is how the animal scenes wait for their
 * gates; listing it is the whole of wiring it.
 */
export const STORY_BEATS: ReadonlySet<string> = new Set([
  ...TOMB_STRUCTURES.flatMap(({ id }) => [`cave.${id}`, `pillar.${id}`, `cavern.${id}`]),
  "camp.firstHome",
  "camp.homeHaul",
  "camp.homeEmpty",
  "camp.rested",
  "camp.chapterJunior",
  "camp.chapterExpert",
  "camp.chapterMaster",
  "camp.chapterWizard",
  "camp.firstFind",
  "camp.structureDone",
  "bond.starter",
  "bond.starterTomb",
  "bond.junior",
  "bond.expert",
  "bond.master",
  "bond.wizard",
])
