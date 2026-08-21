/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle, type StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { STAR_BATTLE_META } from "@/mods/puzzle/game/starBattle/meta"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

const StarBattleComponent: FamilyPlugin<StarBattlePuzzleWithAnswer>["Component"] = ({
  puzzle,
  ctx,
  onSolved,
  onCancel,
}) => <StarBattlePuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />

if (isModEnabled("puzzle"))
  registerFamily({
    meta: STAR_BATTLE_META,
    generate: (seed, ctx) => generateStarBattle(seed, STAR_BATTLE_CONFIG[ctx.difficulty ?? "starter"]),
    Component: StarBattleComponent,
  })
