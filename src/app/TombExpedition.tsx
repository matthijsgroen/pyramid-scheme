import { useJourneys, type JourneyState } from "@/app/state/useJourneys"
import clsx from "clsx"
import { useCallback, type FC } from "react"
import { useTranslation } from "react-i18next"
import { TombPuzzle } from "./TombLevel/TombPuzzle"
import { useTableauTranslations } from "@/data/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import type { TreasureTombJourney } from "@/data/journeys"
import { ComparePuzzle } from "./TombLevel/ComparePuzzle"
import { TombBackdrop } from "@/ui/TombBackdrop"

export const TombExpedition: FC<{
  activeJourney: JourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({ onClose, activeJourney, onLevelComplete, onJourneyComplete }) => {
  const { t } = useTranslation("common")
  const tableaux = useTableauTranslations()

  const journey = activeJourney.journey as TreasureTombJourney
  const { journeyLog, completeLevel } = useJourneys()
  const runNr = journeyLog.filter(
    (log) => log.journeyId === journey.id && log.completed
  ).length

  const runTableaus = tableaux.filter(
    (tab) =>
      tab.tombJourneyId === activeJourney.journeyId &&
      tab.runNumber === runNr + 1
  )

  // if there are no run Tableaus, that means there is nothing to discover at this tomb anymore!

  const handleLevelComplete = useCallback(() => {
    console.log("handle level complete")
    // Complete the level in the journey system
    console.log("calling completeLevel")
    completeLevel()

    // Call the external level complete handler
    console.log("calling onLevelComplete")
    onLevelComplete?.()
  }, [completeLevel, onLevelComplete])

  const seed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const random = mulberry32(seed)
  const tableau = runTableaus[activeJourney.levelNr - 1]
  if (tableau === undefined) {
    return (
      <TombBackdrop>
        <div className="flex h-full w-full flex-col">
          <div className="flex-shrink-0 backdrop-blur-xs">
            <div
              className={clsx(
                "flex w-full items-center justify-between gap-4 px-4 py-2",
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
          {/* final puzzle for treasure */}
          <ComparePuzzle
            activeJourney={activeJourney}
            onComplete={onJourneyComplete}
          />
        </div>
      </TombBackdrop>
    )
  }

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
    <TombBackdrop className="relative flex h-dvh flex-col">
      <div className="flex h-full w-full flex-col">
        <div className="flex-shrink-0 backdrop-blur-xs">
          <div
            className={clsx(
              "flex w-full items-center justify-between gap-4 px-4 py-2",
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
              {journey.name} {activeJourney.levelNr}/{journey.levelCount}
            </h1>
            <span></span>
          </div>
        </div>
        <TombPuzzle
          key={activeJourney.journeyId + activeJourney.levelNr}
          tableau={tableau}
          calculation={calculation}
          difficulty={journey.difficulty}
          onComplete={handleLevelComplete}
        />
      </div>
    </TombBackdrop>
  )
}
