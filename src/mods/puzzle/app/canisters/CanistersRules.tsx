import type { FC } from "react"
import { useTranslation } from "react-i18next"

/**
 * What this board affords, said once per rule it actually has (`puzzle-screens.md` §1.1).
 *
 * **The first three are worded per face and the rest are not**, and that is the honest split: a
 * korenmaat is tipped and an amphora is decanted, so those sentences name their own vessel and their own
 * material — while claiming a vessel, moving to the next amount, and the arithmetic itself read the same
 * wherever you are.
 *
 * **The method bullets are here rather than behind the hint button**, and this family is the only one that
 * needs them. Every other family teaches its method through its own clues: a futoshiki sign says what to
 * do with it. Pouring says nothing, and there is no technique ladder to find it from (design doc §4), so
 * a player who is never told would have to buy a general truth about the family with a hint, one board at
 * a time. It costs nothing to give: it is how to think, not what this board's answer is.
 */
export const CanistersRules: FC<{ skin: string; legs: number }> = ({ skin, legs }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`canisters.rules.${skin}.moves`)}</li>
      <li>{t(`canisters.rules.${skin}.contents`)}</li>
      <li>{t(`canisters.rules.${skin}.levels`)}</li>
      <li>{t("canisters.rules.method.sums")}</li>
      <li>{t("canisters.rules.method.backwards")}</li>
      <li>{t("canisters.rules.claim")}</li>
      {legs > 1 && <li>{t("canisters.rules.legs")}</li>}
    </ul>
  )
}
