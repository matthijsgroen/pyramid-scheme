/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { generateSumplete, type SumpleteGrid } from "@/game/puzzles/sumplete/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"

const SumpleteComponent: FamilyPlugin<SumpleteGrid>["Component"] = ({ puzzle, onSolved }) => (
  <SumpletePuzzle
    grid={puzzle.grid}
    rowTargets={puzzle.rowTargets}
    colTargets={puzzle.colTargets}
    onSolved={onSolved}
  />
)

registerFamily({
  meta: { id: "sumplete", ownerMod: "puzzle", tags: ["puzzle"], icon: "🔢", color: "blue" },
  generate: (seed, ctx): SumpleteGrid =>
    generateSumplete(["expert", "master", "wizard"].includes(ctx.difficulty ?? "starter") ? 4 : 3, seed, {
      allowZeroTargets: ctx.difficulty === "wizard",
    }),
  Component: SumpleteComponent,
})
