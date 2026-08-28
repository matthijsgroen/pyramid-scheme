/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { CanistersPuzzle as CanistersPuzzleData } from "@/mods/puzzle/game/canisters/canisters"
import { CANISTERS_META } from "@/mods/puzzle/game/canisters/meta"
import { CanistersPuzzle as CanistersPuzzleScreen } from "./CanistersPuzzle"

const CanistersComponent: FamilyPlugin<CanistersPuzzleData>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <CanistersPuzzleScreen
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    role={ctx.role}
    theme={ctx.theme}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: CANISTERS_META,
    generate: (seed, ctx) => generatePuzzle<CanistersPuzzleData>(CANISTERS_META, seed, ctx),
    Component: CanistersComponent,
  })
