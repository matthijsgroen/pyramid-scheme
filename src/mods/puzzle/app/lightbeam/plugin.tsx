/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  generateLightbeam,
  type LightbeamMode,
  type LightbeamPuzzle as LightbeamGrid,
} from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { LIGHTBEAM_META } from "@/mods/puzzle/game/lightbeam/meta"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const LightbeamComponent: FamilyPlugin<LightbeamGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <LightbeamPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

/**
 * Modes a lab variant forces on top of the tier's own dials, for playtesting one shape at a time
 * (`puzzle-screens.md` §6). A tier draws its own modes; this is how a developer looks at just one of them.
 */
const VARIANT_MODES: Record<string, LightbeamMode[]> = {
  "wall-heavy": ["wallHeavy"],
  "slider-heavy": ["sliderHeavy"],
  "switch-heavy": ["switchHeavy"],
}

export const generateLightbeamFor = (
  difficulty: Difficulty | undefined,
  seed: number,
  variant?: string
): LightbeamGrid => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty ?? "starter"]
  const forced = variant ? VARIANT_MODES[variant] : undefined
  // A forced mode replaces the pool rather than adding to it, or the board would still draw its own two.
  if (forced) return generateLightbeam(size, seed, { ...options, modePool: undefined, modes: forced })
  return generateLightbeam(size, seed, options)
}

if (isModEnabled("puzzle"))
  registerFamily({
    meta: LIGHTBEAM_META,
    generate: (seed, ctx): LightbeamGrid => generateLightbeamFor(ctx.difficulty, seed, ctx.variant),
    Component: LightbeamComponent,
  })
