import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateRushHour, gradeRushHour } from "./generateRushHour"
import { RUSH_HOUR_CONFIG } from "./rushHourConfig"

/**
 * The blockade: pieces pinned in their lanes, and one of them has to get out.
 *
 * **The only family in the catalogue that is planning rather than deduction** (`PUZZLE_FAMILIES.md`
 * §4.17). Nothing about a position is uncertain and there is nothing to work out about a cell — the whole
 * question is the ORDER of a dozen moves, which is a different muscle from everything else here and the
 * reason it earns a slot.
 */
export const RUSH_HOUR_META: FamilyMeta = {
  id: "rush-hour",
  ownerMod: "puzzle",
  // **`puzzle` alone, deliberately.** The board reads as coloured blocks in lanes, which is no place at
  // all, and a tag is a claim that this family can DRESS as somewhere (`familyMeta.ts`'s `faces`). The
  // fiction this mechanic is for — sledges jammed in a market lane, barges at a quay — is `trade`, whose
  // pool sits one member short of the floor a journey needs (`journeys.md` §9), so the tag is worth real
  // rooms the day the face exists. It lands with the art, not before it.
  tags: ["puzzle"],
  themes: ["default"],
  minTier: "starter",
  icon: "🚧",
  color: "orange",
  rewardPriority: 60, // a puzzle room like any other — fills once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => RUSH_HOUR_CONFIG[difficulty ?? "starter"],
    generate: generateRushHour,
    grade: gradeRushHour,
  }),
}
