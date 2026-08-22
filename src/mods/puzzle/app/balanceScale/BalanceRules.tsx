import type { FC } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  /** A glyph weighing the same everywhere only means something once there is more than one row. */
  manyRows: boolean
  /** Some piece on this board has its match across the beam. */
  cancelling: boolean
  /** This board is one where a glyph has to be traded for what a row says it is worth. */
  swapping: boolean
}

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
//
// Only the moves this board actually affords are listed. A starter board is one scale and one glyph,
// and five rules over it is a wall of text about things that cannot happen — the rules grow with the
// board, the same way the ladder does (design doc §7).
export const BalanceRules: FC<Props> = ({ manyRows, cancelling, swapping }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      {manyRows && <li>{t("balance.rules.same")}</li>}
      <li>{t("balance.rules.tap")}</li>
      {/* Cancelling and swapping are each a fact about scales AND the gesture that applies it, so they sit
          after the plain tap rather than being split across a line that does not fit them. */}
      {cancelling && <li>{t("balance.rules.cancel")}</li>}
      {swapping && <li>{t("balance.rules.swap")}</li>}
    </ul>
  )
}
