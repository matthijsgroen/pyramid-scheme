import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the sky is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const ConstellationRules: FC = () => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("constellation.rules.goal")}</li>
      <li>{t("constellation.rules.straight")}</li>
      <li>{t("constellation.rules.pair")}</li>
      <li>{t("constellation.rules.cross")}</li>
      <li>{t("constellation.rules.whole")}</li>
      <li>{t("constellation.rules.enter")}</li>
    </ul>
  )
}
