/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import { generateSumplete, type SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SUMPLETE_CONFIG } from "@/mods/puzzle/game/sumplete/sumpleteConfig"
import { SumpletePuzzle } from "./SumpletePuzzle"
import { SUMPLETE_META } from "@/mods/puzzle/game/sumplete/meta"
import { isModEnabled } from "@/mods/registeredMods"

const SumpleteComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, onSolved, onCancel }) => (
  <SumpletePuzzle puzzle={puzzle} onSolved={onSolved} onCancel={onCancel} />
)

export const generateSumpleteFor = (difficulty: Difficulty | undefined, seed: number): SumpleteGrid => {
  const { size, ...options } = SUMPLETE_CONFIG[difficulty ?? "starter"]
  return generateSumplete(size, seed, options)
}

if (isModEnabled("puzzle"))
  registerFamily({
    meta: SUMPLETE_META,
    generate: (seed, ctx): SumpleteGrid => generateSumpleteFor(ctx.difficulty, seed),
    Component: SumpleteComponent,
  })
