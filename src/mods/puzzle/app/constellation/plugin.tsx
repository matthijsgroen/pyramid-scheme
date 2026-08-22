/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { ConstellationPuzzleWithAnswer } from "@/mods/puzzle/game/constellation/generateConstellation"
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
    role={ctx.role}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: CONSTELLATION_META,
    generate: (seed, ctx) => generatePuzzle<ConstellationPuzzleWithAnswer>(CONSTELLATION_META, seed, ctx),
    Component: ConstellationComponent,
  })
