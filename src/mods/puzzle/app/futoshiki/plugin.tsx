/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FutoshikiPuzzle as FutoshikiGrid } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FUTOSHIKI_META } from "@/mods/puzzle/game/futoshiki/meta"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const FutoshikiComponent: FamilyPlugin<FutoshikiGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <FutoshikiPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateFutoshikiFor = (difficulty: Difficulty | undefined, seed: number): FutoshikiGrid =>
  generatePuzzle<FutoshikiGrid>(FUTOSHIKI_META, seed, { difficulty })

if (isModEnabled("puzzle"))
  registerFamily({
    meta: FUTOSHIKI_META,
    generate: (seed, ctx): FutoshikiGrid => generateFutoshikiFor(ctx.difficulty, seed),
    Component: FutoshikiComponent,
  })
