import { useTranslation } from "react-i18next"
import {
  generateTableaus,
  tableauLevels,
  type TableauLevel,
} from "@/data/tableaus"
import { useMemo } from "react"

export const useTableauTranslations = (): TableauLevel[] => {
  const { t } = useTranslation("tableaus")

  return useMemo(() => generateTableaus(t), [t])
}

export const useTableauTranslation = (levelNr: number) => {
  const { t } = useTranslation("tableaus")

  const tableau = tableauLevels.find((tab) => tab.levelNr === levelNr)

  if (!tableau) {
    return null
  }

  return {
    ...tableau,
    name: t(`${tableau.levelNr}.name`),
    description: t(`${tableau.levelNr}.description`),
  }
}
