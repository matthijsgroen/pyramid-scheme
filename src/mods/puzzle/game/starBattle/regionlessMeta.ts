import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateRegionlessBattle, gradeRegionlessBattle } from "./generateRegionlessBattle"
import { REGIONLESS_BATTLE_CONFIG } from "./regionlessConfig"

export const REGIONLESS_BATTLE_META: FamilyMeta = {
  id: "regionless-battle",
  ownerMod: "puzzle",
  tags: ["puzzle", "light", "trade", "water", "funerary"],
  faces: { light: ["default"], trade: ["market"], water: ["lotus"], funerary: ["cats"] },
  themes: ["default", "market", "lotus", "cats"],
  // The entry tier per docs/game-design/puzzles/regionless-battle.md; the tier session may move it. Lab-only
  // because it is not in `puzzleMod.families`.
  minTier: "expert",
  icon: "🪔",
  color: "amber",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => REGIONLESS_BATTLE_CONFIG[difficulty ?? "expert"],
    generate: generateRegionlessBattle,
    grade: gradeRegionlessBattle,
  }),
  rewardPriority: 60,
}
