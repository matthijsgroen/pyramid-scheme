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
  animals: [
    "animal.forSale",
    "animal.boughtDonkey",
    "animal.blockedDonkey",
    "animal.throughDonkey",
    "animal.arrivesDonkey",
    "animal.boughtCart",
    "animal.blockedCart",
    "animal.throughCart",
    "animal.arrivesCart",
    "animal.boughtCamel",
    "animal.blockedCamel",
    "animal.throughCamel",
    "animal.arrivesCamel",
    "animal.boughtSecondDonkey",
    "animal.blockedSecondDonkey",
    "animal.throughSecondDonkey",
    "animal.arrivesSecondDonkey",
    "animal.boughtSecondCamel",
    "animal.blockedSecondCamel",
    "animal.throughSecondCamel",
    "animal.arrivesSecondCamel",
    "animal.boughtSturdyCart",
    "animal.blockedSturdyCart",
    "animal.throughSturdyCart",
    "animal.arrivesSturdyCart",
    "animal.boughtCaravanBanner",
    "animal.arrivesCaravanBanner",
  ],
}

/** The seam each kind of animal beat still waits on, by id prefix; a kind with none is wired. */
const ANIMAL_SEAMS: readonly (readonly [prefix: string, seam: string])[] = [
  ["animal.forSale", "Fez's stall reports no moment when it shows a purchase"],
  ["animal.blocked", "Travel reports no moment when a gate shows its unmet need"],
]

/** Beats written before the game has the seam that plays them: beat id → the missing seam. */
export const WAITING_BEATS: Readonly<Record<string, string>> = Object.fromEntries(
  DRAFT_BEATS.animals.flatMap(id => {
    const seam = ANIMAL_SEAMS.find(([prefix]) => id.startsWith(prefix))?.[1]
    return seam ? [[id, seam]] : []
  })
)

/** The animal beats a seam plays: every one not waiting. */
export const WIRED_ANIMAL_BEATS: readonly string[] = DRAFT_BEATS.animals.filter(id => !(id in WAITING_BEATS))
