import type { FC } from "react"
import { useTranslation } from "react-i18next"

/**
 * What this board affords, said once per rule it actually has (`puzzle-screens.md` §1.1).
 *
 * **The first three are worded per face and the last two are not**, and that is the honest split: a
 * korenmaat is tipped and an amphora is decanted, so those sentences name their own vessel and their own
 * material — while claiming a vessel and moving to the next amount read the same wherever you are.
 */
export const CanistersRules: FC<{ skin: string; legs: number }> = ({ skin, legs }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`canisters.rules.${skin}.moves`)}</li>
      <li>{t(`canisters.rules.${skin}.contents`)}</li>
      <li>{t(`canisters.rules.${skin}.hidden`)}</li>
      <li>{t("canisters.rules.claim")}</li>
      {legs > 1 && <li>{t("canisters.rules.legs")}</li>}
    </ul>
  )
}
