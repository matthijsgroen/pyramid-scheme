/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamPuzzle as LightbeamGrid } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_META } from "@/mods/puzzle/game/lightbeam/meta"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const LightbeamComponent: FamilyPlugin<LightbeamGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <LightbeamPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateLightbeamFor = (
  difficulty: Difficulty | undefined,
  seed: number,
  variant?: string
): LightbeamGrid => generatePuzzle<LightbeamGrid>(LIGHTBEAM_META, seed, { difficulty, variant })

if (isModEnabled("puzzle"))
  registerFamily({
    meta: LIGHTBEAM_META,
    generate: (seed, ctx): LightbeamGrid => generatePuzzle<LightbeamGrid>(LIGHTBEAM_META, seed, ctx),
    Component: LightbeamComponent,
  })
