import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the board is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const ProcessionRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`procession.rules.${skin}.lengths`)}</li>
      <li>{t(`procession.rules.${skin}.marks`)}</li>
      <li>{t(`procession.rules.${skin}.drag`)}</li>
    </ul>
  )
}
