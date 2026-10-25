import { TOMB_STRUCTURES } from "@/data/journeyStructure"

/**
 * The camp release's story beats, written and waiting on the designer
 * (docs/game-design/story/script-camp-release.md), listed by the area they belong to.
 *
 * A tomb has three: `cave.<tombId>` on the cave mouth, `pillar.<tombId>` at the cave's exit pillar,
 * and `cavern.<tombId>` on the cavern's exterior. The camp's and the structures' beats share the `camp` group.
 */
export const DRAFT_BEATS: Readonly<Record<"tombs" | "camp" | "structures" | "animals", readonly string[]>> = {
  tombs: TOMB_STRUCTURES.flatMap(({ id }) => [`cave.${id}`, `pillar.${id}`, `cavern.${id}`]),
  camp: [
    "camp.firstHome",
    "camp.homeHaul",
    "camp.homeEmpty",
    "camp.rested",
    "camp.chapterJunior",
    "camp.chapterExpert",
    "camp.chapterMaster",
    "camp.chapterWizard",
  ],
  structures: ["camp.firstFind", "camp.structureDone"],
  animals: [],
}

/** Beats written before the game has the seam that plays them: beat id → the missing seam. */
export const WAITING_BEATS: Readonly<Record<string, string>> = {}
