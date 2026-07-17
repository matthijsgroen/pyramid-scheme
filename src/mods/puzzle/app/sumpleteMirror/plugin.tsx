/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { generateSumplete, type SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SumpletePuzzle } from "@/mods/puzzle/app/sumplete/SumpletePuzzle"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { SUMPLETE_MIRROR_META } from "@/mods/puzzle/game/sumpleteMirror/meta"
import { isModEnabled } from "@/mods/registeredMods"

// Acceptance-demo puzzle family (§A.3): reuses sumplete's generator + board unchanged, registered
// under a distinct id but the same "puzzle" tag. Adding this file (plus its meta in the family
// list) is the ENTIRE change needed for the world to start serving a second puzzle type — the
// encounter allocator, specs, and siteAssembler are untouched.
const SumpleteMirrorComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, onSolved, onCancel }) => (
  <PuzzleFamilyShell onSolved={onSolved} onCancel={onCancel}>
    {handleSolved => (
      <SumpletePuzzle
        grid={puzzle.grid}
        rowTargets={puzzle.rowTargets}
        colTargets={puzzle.colTargets}
        onSolved={handleSolved}
      />
    )}
  </PuzzleFamilyShell>
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: SUMPLETE_MIRROR_META,
    generate: (seed, ctx): SumpleteGrid =>
      generateSumplete(["expert", "master", "wizard"].includes(ctx.difficulty ?? "starter") ? 4 : 3, seed, {
        allowZeroTargets: ctx.difficulty === "wizard",
      }),
    Component: SumpleteMirrorComponent,
  })
