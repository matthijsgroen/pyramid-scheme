import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateRegionlessBattle, gradeRegionlessBattle } from "./generateRegionlessBattle"
import { REGIONLESS_BATTLE_CONFIG } from "./regionlessConfig"

export const REGIONLESS_BATTLE_META: FamilyMeta = {
  id: "regionless-battle",
  ownerMod: "puzzle",
  tags: ["puzzle", "funerary", "cosmos"],
  faces: { funerary: ["default"], cosmos: ["default"] },
  themes: ["default"],
  // Lab-only until a skin carries it; the walls need a reading before a site is dealt this board.
  minTier: "expert",
  icon: "🪲",
  color: "amber",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => REGIONLESS_BATTLE_CONFIG[difficulty ?? "expert"],
    generate: generateRegionlessBattle,
    grade: gradeRegionlessBattle,
  }),
  rewardPriority: 60,
}
