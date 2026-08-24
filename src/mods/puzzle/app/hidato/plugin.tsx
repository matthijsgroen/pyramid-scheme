/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { HidatoPuzzle } from "@/mods/puzzle/game/hidato/generateHidato"
import { HIDATO_META } from "@/mods/puzzle/game/hidato/meta"
import { HidatoPuzzle as HidatoPuzzleScreen } from "./HidatoPuzzle"

const HidatoComponent: FamilyPlugin<HidatoPuzzle>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <HidatoPuzzleScreen
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
    meta: HIDATO_META,
    generate: (seed, ctx) => generatePuzzle<HidatoPuzzle>(HIDATO_META, seed, ctx),
    Component: HidatoComponent,
  })
