import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const FutoshikiRules: FC = () => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("futoshiki.rules.goal")}</li>
      <li>{t("futoshiki.rules.signs")}</li>
      <li>{t("futoshiki.rules.enter")}</li>
      <li>{t("futoshiki.rules.notes")}</li>
    </ul>
  )
}
