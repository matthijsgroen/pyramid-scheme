/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle, type StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { STAR_BATTLE_META } from "@/mods/puzzle/game/starBattle/meta"
import { TWIN_STARS_CONFIG, TWIN_STARS_META } from "@/mods/puzzle/game/starBattle/twinStars"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

const StarBattleComponent: FamilyPlugin<StarBattlePuzzleWithAnswer>["Component"] = ({
  puzzle,
  ctx,
  onSolved,
  onCancel,
}) => <StarBattlePuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />

if (isModEnabled("puzzle")) {
  registerFamily({
    meta: STAR_BATTLE_META,
    generate: (seed, ctx) => generateStarBattle(seed, STAR_BATTLE_CONFIG[ctx.difficulty ?? "starter"]),
    Component: StarBattleComponent,
  })
  // Two stars to a group, and nothing else different: the same screen reads its quota off the board it is
  // handed, so the second family is a tier table and a name (game/starBattle/twinStars.ts).
  registerFamily({
    meta: TWIN_STARS_META,
    generate: (seed, ctx) => generateStarBattle(seed, TWIN_STARS_CONFIG[ctx.difficulty ?? "expert"]),
    Component: StarBattleComponent,
  })
}
