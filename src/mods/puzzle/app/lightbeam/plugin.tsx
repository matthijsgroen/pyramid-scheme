/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  generateLightbeam,
  type LightbeamPuzzle as LightbeamGrid,
} from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { LIGHTBEAM_META } from "@/mods/puzzle/game/lightbeam/meta"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const LightbeamComponent: FamilyPlugin<LightbeamGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <LightbeamPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateLightbeamFor = (difficulty: Difficulty | undefined, seed: number): LightbeamGrid => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty ?? "starter"]
  return generateLightbeam(size, seed, options)
}

if (isModEnabled("puzzle"))
  registerFamily({
    meta: LIGHTBEAM_META,
    generate: (seed, ctx): LightbeamGrid => generateLightbeamFor(ctx.difficulty, seed),
    Component: LightbeamComponent,
  })
