import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the board is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
//
// **Worded per face, with the plain day as the fallback.** What differs between a burial and a night sky
// is which doings fill the rows (skins.ts) — the rules themselves are the same three sentences about bars,
// marks and dragging, so a face says them again only if it has something else to say.
export const ProcessionRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  const rule = (id: string) => t([`procession.rules.${skin}.${id}`, `procession.rules.default.${id}`])
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{rule("lengths")}</li>
      <li>{rule("marks")}</li>
      <li>{rule("drag")}</li>
    </ul>
  )
}
