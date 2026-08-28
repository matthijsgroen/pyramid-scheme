import type { FC } from "react"
import { useTranslation } from "react-i18next"

/** What this board affords, said once per rule it actually has (`puzzle-screens.md` §1.1). */
export const CanistersRules: FC<{ skin: string; legs: number }> = ({ skin, legs }) => {
  const { t } = useTranslation("common")
  return (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t(`canisters.rules.${skin}.moves`)}</li>
      <li>{t(`canisters.rules.${skin}.water`)}</li>
      <li>{t(`canisters.rules.${skin}.hidden`)}</li>
      <li>{t(`canisters.rules.${skin}.claim`)}</li>
      {legs > 1 && <li>{t(`canisters.rules.${skin}.legs`)}</li>}
    </ul>
  )
}
