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
  // **`puzzle` alone, and the same reasoning rush hour's tag list carries.** A face is a claim that this
  // board can DRESS as a place, and today it is bars on a track: no place at all. The fiction it is for is
  // `funerary` — bearers, rites and the sealing, walked through the day of a burial — and `cosmos`, decans
  // crossing the night. Both land with the painted art, not before it (family doc §8).
  tags: ["puzzle"],
  themes: ["default"],
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
