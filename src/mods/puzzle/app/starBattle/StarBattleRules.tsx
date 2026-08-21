import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const StarBattleRules: FC = () => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("starBattle.rules.goal")}</li>
      <li>{t("starBattle.rules.touch")}</li>
      <li>{t("starBattle.rules.blocked")}</li>
      <li>{t("starBattle.rules.enter")}</li>
    </ul>
  )
}
