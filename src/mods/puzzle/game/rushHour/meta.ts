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
  // **`trade` is claimed now that the face exists.** A tag says this family can DRESS as somewhere
  // (`familyMeta.ts`'s `faces`), and until the market lane was painted the board was coloured blocks in
  // lanes, which is no place at all. It is painted (`art-pipeline.md` §A), so the claim is honest, and
  // `trade` was the pool one member short of the floor a journey needs to restrict to it (`journeys.md` §9).
  tags: ["puzzle", "trade"],
  faces: {
    trade: ["market"],
  },
  // A site never names a skin, it names a role (`puzzle-screens.md` §2) — this list is what the puzzle
  // lab's picker reads, which is the only place a face is chosen by name.
  themes: ["default", "market"],
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
