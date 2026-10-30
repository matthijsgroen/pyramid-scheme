import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it (docs/instructions/puzzle-screens.md §1). Worded per place.
export const PairPuzzleRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`pairPuzzle.rules.${skin}.pair`)}</li>
      <li>{t(`pairPuzzle.rules.${skin}.count`)}</li>
      <li>{t(`pairPuzzle.rules.${skin}.touch`)}</li>
      <li>{t(`pairPuzzle.rules.${skin}.enter`)}</li>
    </ul>
  )
}
