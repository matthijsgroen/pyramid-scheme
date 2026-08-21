/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import {
  generateConstellation,
  type ConstellationPuzzleWithAnswer,
} from "@/mods/puzzle/game/constellation/generateConstellation"
import { CONSTELLATION_META } from "@/mods/puzzle/game/constellation/meta"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

const ConstellationComponent: FamilyPlugin<ConstellationPuzzleWithAnswer>["Component"] = ({
  puzzle,
  ctx,
  onSolved,
  onCancel,
}) => (
  <ConstellationPuzzle
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    theme={ctx.theme}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: CONSTELLATION_META,
    generate: (seed, ctx) => generateConstellation(seed, CONSTELLATION_CONFIG[ctx.difficulty ?? "starter"]),
    Component: ConstellationComponent,
  })
