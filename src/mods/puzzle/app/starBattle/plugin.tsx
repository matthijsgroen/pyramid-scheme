/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { STAR_BATTLE_META } from "@/mods/puzzle/game/starBattle/meta"
import { TWIN_STARS_META } from "@/mods/puzzle/game/starBattle/twinStars"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

const StarBattleComponent: FamilyPlugin<StarBattlePuzzleWithAnswer>["Component"] = ({
  puzzle,
  ctx,
  onSolved,
  onCancel,
}) => (
  <StarBattlePuzzle
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    role={ctx.role}
    theme={ctx.theme}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

if (isModEnabled("puzzle")) {
  registerFamily({
    meta: STAR_BATTLE_META,
    generate: (seed, ctx) => generatePuzzle<StarBattlePuzzleWithAnswer>(STAR_BATTLE_META, seed, ctx),
    Component: StarBattleComponent,
  })
  // Two stars to a group, and nothing else different: the same screen reads its quota off the board it is
  // handed, so the second family is a tier table and a name (game/starBattle/twinStars.ts).
  registerFamily({
    meta: TWIN_STARS_META,
    generate: (seed, ctx) => generatePuzzle<StarBattlePuzzleWithAnswer>(TWIN_STARS_META, seed, ctx),
    Component: StarBattleComponent,
  })
}
