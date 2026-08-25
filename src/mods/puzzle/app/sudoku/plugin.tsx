/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { SudokuPuzzle as SudokuGrid } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_META } from "@/mods/puzzle/game/sudoku/meta"
import { SudokuPuzzle } from "./SudokuPuzzle"

const SudokuComponent: FamilyPlugin<SudokuGrid>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <SudokuPuzzle
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
    meta: SUDOKU_META,
    generate: (seed, ctx) => generatePuzzle<SudokuGrid>(SUDOKU_META, seed, ctx),
    Component: SudokuComponent,
  })
