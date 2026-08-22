import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { LightbeamPuzzleData } from "@/mods/puzzle/game/lightbeam/beam"

// Read below the board, never in the way of it: the puzzle is solvable without ever reading this
// (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
//
// The socket line appears only on a board that has one. A rule about a mechanic that is not on the grid in
// front of you is worse than no rule — it sends the player looking for something that is not there.
export const LightbeamRules: FC<{ puzzle: LightbeamPuzzleData }> = ({ puzzle }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t("lightbeam.rules.mirrors")}</li>
      <li>{t("lightbeam.rules.walls")}</li>
      {!!puzzle.nodes?.length && <li>{t("lightbeam.rules.nodes")}</li>}
      {/* What the player DOES comes last, after what the board is: the constraints read as one thought
          rather than with a control instruction sitting in the middle of them. */}
      <li>{t("lightbeam.rules.tap")}</li>
    </ul>
  )
}
