import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateProcession, gradeProcession } from "./generateProcession"
import { PROCESSION_CONFIG } from "./processionConfig"

/**
 * The ordered hours: a day, the things that happen in it, and when each one happens.
 *
 * **The one family that reasons about duration** (`PUZZLE_FAMILIES.md` §4.29). Every other family here
 * asks what belongs in a cell; this one gives the lengths and hides the starts, so what a player works out
 * is elapsed time — how long a gap is, what fits between two fixed points, which of two things can
 * possibly come first.
 */
export const PROCESSION_META: FamilyMeta = {
  id: "procession",
  ownerMod: "puzzle",
  // **Four places besides the plain one, and each is a CAST rather than a coat of paint** (family doc §8).
  // Every doing this board holds is a sign and a name, so dressing it as somewhere is six of each — the
  // ruled track, the chips and the colours never change. That is what makes the claim behind these tags
  // real: a funerary room gets the rites, a cosmos room gets the lights crossing the sky, and neither is
  // waiting on art that has not been drawn.
  //
  // `cosmos` is the one journey nothing serves today (`journeys.md` §9), and this family is its first
  // member rather than the whole answer — a role needs four before a journey may restrict to it (§11.0).
  tags: ["puzzle", "funerary", "cosmos", "water", "trade"],
  faces: {
    funerary: ["funerary"],
    cosmos: ["cosmos"],
    water: ["water"],
    trade: ["trade"],
  },
  themes: ["default", "funerary", "cosmos", "water", "trade"],
  minTier: "starter",
  icon: "⏳",
  color: "teal",
  rewardPriority: 60, // a puzzle room like any other — fills once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => PROCESSION_CONFIG[difficulty ?? "starter"],
    generate: generateProcession,
    grade: gradeProcession,
  }),
}
