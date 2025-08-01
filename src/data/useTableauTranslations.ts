import { useTranslation } from "react-i18next"
import { tableauLevels } from "./tableaus"

export const useTableauTranslations = () => {
  const { t } = useTranslation("tableaus")

  return tableauLevels.map((tableau) => ({
    ...tableau,
    name: t(`${tableau.levelNr}.name`),
    description: t(`${tableau.levelNr}.description`),
  }))
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
