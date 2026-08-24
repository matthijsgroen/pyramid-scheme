import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2). Worded per place, like the goal above it
// — a channel across a flood plain is not dug the way a run of numbered chambers is filled in (§4.3).
export const HidatoRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`hidato.rules.${skin}.given`)}</li>
      <li>{t(`hidato.rules.${skin}.enter`)}</li>
      <li>{t(`hidato.rules.${skin}.back`)}</li>
    </ul>
  )
}
