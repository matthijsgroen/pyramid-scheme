/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse, type EclipsePuzzleWithAnswer } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { ECLIPSE_META } from "@/mods/puzzle/game/eclipse/meta"
import { EclipsePuzzle } from "./EclipsePuzzle"

const EclipseComponent: FamilyPlugin<EclipsePuzzleWithAnswer>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <EclipsePuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: ECLIPSE_META,
    generate: (seed, ctx) => generateEclipse(seed, ECLIPSE_CONFIG[ctx.difficulty ?? "starter"]),
    Component: EclipseComponent,
  })
