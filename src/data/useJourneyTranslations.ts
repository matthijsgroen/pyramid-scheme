import { useTranslation } from "react-i18next"
import { journeys } from "./journeys"

export const useJourneyTranslations = () => {
  const { t } = useTranslation("journeys")
  const { t: tCommon } = useTranslation("common")

  return journeys.map((journey) => ({
    ...journey,
    name: t(`${journey.id}.name`),
    description: t(`${journey.id}.description`),
    difficultyLabel: tCommon(`difficulty.${journey.difficulty}`),
    lengthLabel: tCommon(`journeyLength.${journey.journeyLength}`),
    timeLabel: tCommon(`time.${journey.time}`),
  }))
}

export const useJourneyTranslation = (id: string) => {
  const { t } = useTranslation("journeys")
  const { t: tCommon } = useTranslation("common")

  const journey = journeys.find((j) => j.id === id)

  if (!journey) {
    return null
  }

  return {
    ...journey,
    name: t(`${journey.id}.name`),
    description: t(`${journey.id}.description`),
    difficultyLabel: tCommon(`difficulty.${journey.difficulty}`),
    lengthLabel: tCommon(`journeyLength.${journey.journeyLength}`),
    timeLabel: tCommon(`time.${journey.time}`),
  }
}
