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

/** Beats written before the game has the seam that plays them: beat id → the missing seam. */
export const WAITING_BEATS: Readonly<Record<string, string>> = {
  "animal.forSale": "Fez's stall shows a purchase for the first time",
  "animal.boughtDonkey": "a purchase is bought",
  "animal.blockedDonkey": "a gate refuses for want of a purchase",
  "animal.throughDonkey": "a gate opens because of a purchase",
  "animal.arrivesDonkey": "a bought step arrives in the camp",
  "animal.boughtCart": "a purchase is bought",
  "animal.blockedCart": "a gate refuses for want of a purchase",
  "animal.throughCart": "a gate opens because of a purchase",
  "animal.arrivesCart": "a bought step arrives in the camp",
  "animal.boughtCamel": "a purchase is bought",
  "animal.blockedCamel": "a gate refuses for want of a purchase",
  "animal.throughCamel": "a gate opens because of a purchase",
  "animal.arrivesCamel": "a bought step arrives in the camp",
  "animal.boughtSecondDonkey": "a purchase is bought",
  "animal.blockedSecondDonkey": "a gate refuses for want of a purchase",
  "animal.throughSecondDonkey": "a gate opens because of a purchase",
  "animal.arrivesSecondDonkey": "a bought step arrives in the camp",
  "animal.boughtSecondCamel": "a purchase is bought",
  "animal.blockedSecondCamel": "a gate refuses for want of a purchase",
  "animal.throughSecondCamel": "a gate opens because of a purchase",
  "animal.arrivesSecondCamel": "a bought step arrives in the camp",
  "animal.boughtSturdyCart": "a purchase is bought",
  "animal.blockedSturdyCart": "a gate refuses for want of a purchase",
  "animal.throughSturdyCart": "a gate opens because of a purchase",
  "animal.arrivesSturdyCart": "a bought step arrives in the camp",
  "animal.boughtCaravanBanner": "a purchase is bought",
  "animal.arrivesCaravanBanner": "a bought step arrives in the camp",
}
