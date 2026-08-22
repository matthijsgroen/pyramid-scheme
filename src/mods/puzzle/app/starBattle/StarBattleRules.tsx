import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
//
// Worded per place, not per mechanic (§1.1): the no-touching rule is one sentence over a sky and another
// over farmland, where what it means is that two households would be drawing on the same well.
export const StarBattleRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`starBattle.rules.${skin}.touch`)}</li>
      <li>{t(`starBattle.rules.${skin}.enter`)}</li>
    </ul>
  )
}
