import { useJourneys, type JourneyState } from "@/app/state/useJourneys"
import clsx from "clsx"
import { type FC } from "react"
import { useTranslation } from "react-i18next"
import { TombPuzzle } from "./TombLevel/TombPuzzle"
import { useTableauTranslations } from "@/data/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import type { TreasureTombJourney } from "@/data/journeys"

export const TombExpedition: FC<{
  activeJourney: JourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({ onClose, activeJourney }) => {
  const { t } = useTranslation("common")
  const tableaux = useTableauTranslations()

  const journey = activeJourney.journey as TreasureTombJourney
  const { journeyLog } = useJourneys()
  const runNr = journeyLog.filter(
    (log) => log.journeyId === journey.id && log.completed
  ).length

  const runTableaus = tableaux.filter(
    (tab) =>
      tab.tombJourneyId === activeJourney.journeyId &&
      tab.runNumber === runNr + 1
  )
  const seed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const random = mulberry32(seed)
  const tableau = runTableaus[activeJourney.levelNr - 1]

  const calculation = generateRewardCalculation(
    {
      amountSymbols: tableau.symbolCount,
      hieroglyphIds: tableau.inventoryIds,
      numberRange: journey.levelSettings.numberRange,
      operations: journey.levelSettings.operators,
    },
    random
  )

  return (
    <div
      className={
        "[container-type:size] relative flex h-dvh flex-col bg-slate-700"
      }
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex-shrink-0 backdrop-blur-sm">
          <div
            className={clsx(
              "flex w-full items-center justify-between px-4 py-2",
              "text-white"
            )}
          >
            <button
              onClick={onClose}
              className="cursor-pointer text-lg font-bold focus:outline-none"
            >
              {t("ui.backArrow")}
            </button>
            <h1 className="pointer-events-none mt-0 inline-block pt-4 font-pyramid text-2xl font-bold">
              {journey.name}
            </h1>
            <span></span>
          </div>
        </div>
        <TombPuzzle
          tableau={tableau}
          calculation={calculation}
          difficulty={journey.difficulty}
        />
      </div>
    </div>
  )
}
