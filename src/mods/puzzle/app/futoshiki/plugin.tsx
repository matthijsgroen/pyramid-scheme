/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  generateFutoshiki,
  type FutoshikiPuzzle as FutoshikiGrid,
} from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "@/mods/puzzle/game/futoshiki/futoshikiConfig"
import { FUTOSHIKI_META } from "@/mods/puzzle/game/futoshiki/meta"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const FutoshikiComponent: FamilyPlugin<FutoshikiGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <FutoshikiPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateFutoshikiFor = (difficulty: Difficulty | undefined, seed: number): FutoshikiGrid => {
  const { size, ...options } = FUTOSHIKI_CONFIG[difficulty ?? "starter"]
  return generateFutoshiki(size, seed, options)
}

if (isModEnabled("puzzle"))
  registerFamily({
    meta: FUTOSHIKI_META,
    generate: (seed, ctx): FutoshikiGrid => generateFutoshikiFor(ctx.difficulty, seed),
    Component: FutoshikiComponent,
  })
