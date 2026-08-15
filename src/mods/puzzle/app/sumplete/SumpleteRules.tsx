import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const SumpleteRules: FC = () => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("sumplete.rules.goal")}</li>
      <li>{t("sumplete.rules.tap")}</li>
      <li>{t("sumplete.rules.totals")}</li>
    </ul>
  )
}
