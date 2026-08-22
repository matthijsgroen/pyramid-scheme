import type { FC } from "react"
import { useTranslation } from "react-i18next"

/**
 * Read below the board, never in the way of it: the sky is solvable without ever reading this
 * (docs/instructions/puzzle-screens.md §1, PUZZLE_FAMILIES.md P2).
 *
 * **Worded per place, like the goal above it** (`puzzle-screens.md` §1.1). The same rules are a star map, a
 * haul-road network and a waterworks, and a causeway board telling the player that "lines run from one star
 * to the next" is describing something that is not on the screen. The skin knows which place the room is, so
 * the wording asks it — and each place gets whole sentences of its own rather than one sentence with a noun
 * slot, because "van de ene ster naar de volgende" and "van het ene bekken naar het volgende" do not inflect
 * alike.
 */
export const ConstellationRules: FC<{ skin: string }> = ({ skin }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`constellation.rules.${skin}.straight`)}</li>
      <li>{t(`constellation.rules.${skin}.pair`)}</li>
      <li>{t(`constellation.rules.${skin}.cross`)}</li>
      <li>{t(`constellation.rules.${skin}.enter`)}</li>
    </ul>
  )
}
