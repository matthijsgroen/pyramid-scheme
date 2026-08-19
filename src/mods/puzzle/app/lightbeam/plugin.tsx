/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  generateLightbeam,
  type LightbeamPuzzle as LightbeamGrid,
} from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { generateAuthoredLightbeam, type LightbeamMode } from "@/mods/puzzle/game/lightbeam/generateAuthoredLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { LIGHTBEAM_META } from "@/mods/puzzle/game/lightbeam/meta"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { isModEnabled } from "@/mods/registeredMods"

const LightbeamComponent: FamilyPlugin<LightbeamGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <LightbeamPuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

/**
 * Which generator builds the board. `LIGHTBEAM_AUTHORED` is offered in the puzzle lab only: it is the
 * authored construction (design doc §11.16), measured but not shipped, and no tier draws it.
 */
export const LIGHTBEAM_AUTHORED = "authored"

/** Which modes a lab variant asks for, beyond the plain authored board. */
const VARIANT_MODES: Record<string, LightbeamMode[]> = {
  "authored wall-heavy": ["wallHeavy"],
  "authored slider-heavy": ["sliderHeavy"],
  "authored switch-heavy": ["switchHeavy"],
  "authored trap": ["switchHeavy"],
  "authored all modes": ["wallHeavy", "sliderHeavy", "switchHeavy"],
}

export const generateLightbeamFor = (
  difficulty: Difficulty | undefined,
  seed: number,
  variant?: string
): LightbeamGrid => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty ?? "starter"]
  const modes = variant ? VARIANT_MODES[variant] : undefined
  if (variant === LIGHTBEAM_AUTHORED || modes)
    return generateAuthoredLightbeam(size, seed, {
      ...options,
      modes,
      branchDepth: 1,
      interactive: 1,
      sliders: 1,
      doors: 1,
      doorNodes: 1,
      traps: variant === "authored trap" ? 1 : 0,
    })
  return generateLightbeam(size, seed, options)
}

if (isModEnabled("puzzle"))
  registerFamily({
    meta: LIGHTBEAM_META,
    generate: (seed, ctx): LightbeamGrid => generateLightbeamFor(ctx.difficulty, seed, ctx.variant),
    Component: LightbeamComponent,
  })
