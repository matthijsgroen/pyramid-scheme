/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { PairPuzzleWithAnswer } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { PAIR_PUZZLE_META } from "@/mods/puzzle/game/pairPuzzle/meta"
import { PairPuzzle } from "./PairPuzzle"

const PairPuzzleComponent: FamilyPlugin<PairPuzzleWithAnswer>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <PairPuzzle
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    role={ctx.role}
    theme={ctx.theme}
    room={ctx.address}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

// Lab-only: the family is not in the mod's family list, so no site deals it.
if (isModEnabled("puzzle")) {
  registerFamily({
    meta: PAIR_PUZZLE_META,
    generate: (seed, ctx) => generatePuzzle<PairPuzzleWithAnswer>(PAIR_PUZZLE_META, seed, ctx),
    Component: PairPuzzleComponent,
  })
}
