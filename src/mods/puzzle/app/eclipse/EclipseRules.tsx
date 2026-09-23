import type { FC } from "react"
import { useTranslation } from "react-i18next"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
export const EclipseRules: FC<{ signs: boolean }> = ({ signs }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("eclipse.rules.triple")}</li>
      <li>{t("eclipse.rules.copies")}</li>
      {/* A signless board (docs/game-design/puzzles/eclipse.md) has none to explain, and a rule with
          nothing on the board to point at reads as a rule the player has missed. */}
      {signs && <li>{t("eclipse.rules.signs")}</li>}
      <li>{t("eclipse.rules.enter")}</li>
    </ul>
  )
}
