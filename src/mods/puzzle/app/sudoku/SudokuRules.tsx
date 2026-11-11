import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md: the rules sit below the board, reached by scrolling;
// PUZZLE_FAMILIES.md P2). Worded per place, like the goal above it — signs are inked onto a sheet,
// figures are cut into stone (puzzle-screens.md: a mechanic with several faces words each one).
export const SudokuRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`sudoku.rules.${skin}.chambers`)}</li>
      <li>{t(`sudoku.rules.${skin}.given`)}</li>
      <li>{t(`sudoku.rules.${skin}.enter`)}</li>
      <li>{t(`sudoku.rules.${skin}.notes`)}</li>
    </ul>
  )
}
