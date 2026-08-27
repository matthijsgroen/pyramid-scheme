import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateCanisters, gradeCanisters } from "./generateCanisters"
import { CANISTERS_CONFIG } from "./canistersConfig"

export const CANISTERS_META: FamilyMeta = {
  id: "canisters",
  ownerMod: "puzzle",
  // Measuring a volume out of the river is the flood plain's own arithmetic, and the vessels are what
  // an irrigated field is worked with (PUZZLE_FAMILIES.md §11.1, Water & Agriculture). A tag is
  // eligibility and nothing more, so carrying three costs the family nothing.
  tags: ["puzzle", "water", "agriculture"],
  // The opening decision is modular arithmetic on two capacities; below junior a player is still being
  // taught what a pour does, and the design doc's starter tier hands them a move in hand to do it with.
  minTier: "starter",
  icon: "🏺",
  color: "sky",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => CANISTERS_CONFIG[difficulty ?? "starter"],
    generate: generateCanisters,
    grade: gradeCanisters,
  }),
}
