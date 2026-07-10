/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { generateSumplete, type SumpleteGrid } from "@/game/puzzles/sumplete/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"
import { PuzzleFamilyShell } from "@/mods/puzzle/app/PuzzleFamilyShell"
import { SUMPLETE_META } from "@/mods/puzzle/game/sumplete/meta"

const SumpleteComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, onSolved, onCancel }) => (
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

registerFamily({
  meta: SUMPLETE_META,
  generate: (seed, ctx): SumpleteGrid =>
    generateSumplete(["expert", "master", "wizard"].includes(ctx.difficulty ?? "starter") ? 4 : 3, seed, {
      allowZeroTargets: ctx.difficulty === "wizard",
    }),
  Component: SumpleteComponent,
})
