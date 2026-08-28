import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the board is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
//
// Worded per place, not per mechanic (§1.1) — a block in a lane and a sledge in a market street are the
// same rule and not the same sentence.
export const RushHourRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`rushHour.rules.${skin}.lanes`)}</li>
      <li>{t(`rushHour.rules.${skin}.shove`)}</li>
    </ul>
  )
}
