/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SumpletePuzzle } from "@/mods/puzzle/app/sumplete/SumpletePuzzle"
import { generateSumpleteFor } from "@/mods/puzzle/app/sumplete/plugin"
import { SUMPLETE_MIRROR_META } from "@/mods/puzzle/game/sumpleteMirror/meta"
import { isModEnabled } from "@/mods/registeredMods"

// Acceptance-demo puzzle family (§A.3): reuses sumplete's generator + board unchanged, registered
// under a distinct id but the same "puzzle" tag. Adding this file (plus its meta in the family
// list) is the ENTIRE change needed for the world to start serving a second puzzle type — the
// encounter allocator, specs, and siteAssembler are untouched.
const SumpleteMirrorComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, onSolved, onCancel }) => (
  <SumpletePuzzle puzzle={puzzle} onSolved={onSolved} onCancel={onCancel} />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: SUMPLETE_MIRROR_META,
    generate: (seed, ctx): SumpleteGrid => generateSumpleteFor(ctx.difficulty, seed),
    Component: SumpleteMirrorComponent,
  })
