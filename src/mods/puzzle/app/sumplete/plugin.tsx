/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import type { SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"
import { SUMPLETE_META } from "@/mods/puzzle/game/sumplete/meta"
import { isModEnabled } from "@/mods/registeredMods"

const SumpleteComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <SumpletePuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateSumpleteFor = (difficulty: Difficulty | undefined, seed: number): SumpleteGrid =>
  generatePuzzle<SumpleteGrid>(SUMPLETE_META, seed, { difficulty })

if (isModEnabled("puzzle"))
  registerFamily({
    meta: SUMPLETE_META,
    generate: (seed, ctx): SumpleteGrid => generatePuzzle<SumpleteGrid>(SUMPLETE_META, seed, ctx),
    Component: SumpleteComponent,
  })
