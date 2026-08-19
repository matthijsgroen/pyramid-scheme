/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import {
  generateLightbeam,
  type LightbeamPuzzle as LightbeamGrid,
} from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { generateAuthoredLightbeam, type LightbeamMode } from "@/mods/puzzle/game/lightbeam/generateAuthoredLightbeam"
import { AUTHORED_LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/authoredConfig"
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

/** The authored tier table (§11.19) — the dials phase 4 tuned, rather than a mode picked by hand. */
export const LIGHTBEAM_AUTHORED_TIERS = "authored tiers"

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
  // The tier table itself, which is what phase 4 tuned — as against the hand-set mode variants below.
  if (variant === LIGHTBEAM_AUTHORED_TIERS) {
    const { size: tierSize, ...tierOptions } = AUTHORED_LIGHTBEAM_CONFIG[difficulty ?? "starter"]
    return generateAuthoredLightbeam(tierSize, seed, tierOptions)
  }
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
