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

/** The seam each kind of animal beat waits on, by id prefix. */
const ANIMAL_SEAMS: readonly (readonly [prefix: string, seam: string])[] = [
  ["animal.forSale", "Fez's stall shows a purchase for the first time"],
  ["animal.bought", "a purchase is bought"],
  ["animal.blocked", "a gate refuses for want of a purchase"],
  ["animal.through", "a gate opens because of a purchase"],
  ["animal.arrives", "a bought step arrives in the camp"],
]

/** Beats written before the game has the seam that plays them: beat id → the missing seam. */
export const WAITING_BEATS: Readonly<Record<string, string | undefined>> = Object.fromEntries(
  DRAFT_BEATS.animals.map(id => [id, ANIMAL_SEAMS.find(([prefix]) => id.startsWith(prefix))?.[1]])
)
