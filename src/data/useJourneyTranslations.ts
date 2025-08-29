import { useTranslation } from "react-i18next"
import { journeys, type Journey, type PyramidJourney } from "@/data/journeys"

export type TranslatedJourney = Journey & {
  name: string
  description: string
  difficultyLabel: string
  lengthLabel: string
  timeLabel?: string
}

export const useJourneyTranslations = () => {
  const { t } = useTranslation("journeys")
  const { t: tCommon } = useTranslation("common")

  return journeys.map((journey) => ({
    ...journey,
    name: t(`${journey.id}.name`),
    description: t(`${journey.id}.description`),
    difficultyLabel: tCommon(`difficulty.${journey.difficulty}`),
    lengthLabel: tCommon(`journeyLength.${journey.journeyLength}`),
    ...(journey.type === "pyramid" && {
      timeLabel: tCommon(`time.${(journey as PyramidJourney).background.time}`),
    }),
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
    ...(journey.type === "pyramid" && {
      timeLabel: tCommon(`time.${(journey as PyramidJourney).background.time}`),
    }),
  }
}
