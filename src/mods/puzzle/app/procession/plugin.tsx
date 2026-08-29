/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { ProcessionPuzzle as ProcessionPuzzleData } from "@/mods/puzzle/game/procession/procession"
import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import { ProcessionPuzzle as ProcessionPuzzleScreen } from "./ProcessionPuzzle"

const ProcessionComponent: FamilyPlugin<ProcessionPuzzleData>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <ProcessionPuzzleScreen
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
    meta: PROCESSION_META,
    generate: (seed, ctx) => generatePuzzle<ProcessionPuzzleData>(PROCESSION_META, seed, ctx),
    Component: ProcessionComponent,
  })
