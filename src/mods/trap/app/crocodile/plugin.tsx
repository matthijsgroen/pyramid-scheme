/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { CROCODILE_CONFIG } from "@/mods/trap/game/crocodile/crocodileConfig"
import { generateCrossing } from "@/mods/trap/game/crocodile/generateCrossing"
import type { Difficulty } from "@/data/difficultyLevels"
import type { CrossingPuzzle } from "@/mods/trap/game/crocodile/crossingRules"
import { CROCODILE_META } from "@/mods/trap/game/crocodile/meta"
import { isModEnabled } from "@/mods/registeredMods"
import { CrocodilePit } from "./CrocodilePit"

const CrocodileComponent: FamilyPlugin<CrossingPuzzle>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <CrocodilePit puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateCrossingFor = (difficulty: Difficulty | undefined, seed: number): CrossingPuzzle =>
  generateCrossing(seed, CROCODILE_CONFIG[difficulty ?? "junior"])

// The capstone bites, so it is trap-owned and gated on the trap mod — trap off leaves a capstone node
// to the family-absence pass-through, and the tomb floor stays walkable.
if (isModEnabled("trap"))
  registerFamily({
    meta: CROCODILE_META,
    generate: (seed, ctx): CrossingPuzzle => generateCrossingFor(ctx.difficulty, seed),
    Component: CrocodileComponent,
  })
