import { useTranslation } from "react-i18next"
import { generateTableaus, type TableauLevel } from "@/data/tableaus"
import { useMemo } from "react"

export const useTableauTranslations = (): TableauLevel[] => {
  const { t } = useTranslation("tableaus")

  return useMemo(() => generateTableaus(t), [t])
}
