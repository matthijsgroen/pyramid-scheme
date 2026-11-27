import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { CreditsList } from "@/ui/molecules/CreditsList"
import { audioCredits } from "./audioCredits"

export const CreditsPanel: FC = () => {
  const { t } = useTranslation("common")
  return (
    <CreditsList
      heading={t("credits.sounds")}
      credits={audioCredits()}
      empty={t("credits.none")}
      sourceLabel={t("credits.source")}
      licenceLabel={t("credits.licence")}
    />
  )
}
