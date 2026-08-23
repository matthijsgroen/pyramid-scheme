import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateStarBattle, gradeStarBattle } from "./generateStarBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"

export const STAR_BATTLE_META: FamilyMeta = {
  id: "star-battle",
  ownerMod: "puzzle",
  // The same pools twin stars draws from, and the same two faces, because a skin dresses a board and this
  // is the same board (design doc §9). NOT `light` — that is the narrower pool for the families about light
  // itself, and this one is about where things sit.
  tags: ["puzzle", "sky", "water", "agriculture"],
  // Configured for every tier (docs/game-design/puzzles/star-battle.md §5).
  minTier: "starter",
  // A sky and a farm, the same two twin stars lists, so the lab can show both. A site never names a skin, it
  // names a role; `theme: "night"` is an ambience the default skin already is.
  themes: ["default", "fields"],
  icon: "⭐",
  color: "indigo",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => STAR_BATTLE_CONFIG[difficulty ?? "starter"],
    generate: generateStarBattle,
    grade: gradeStarBattle,
  }),
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
