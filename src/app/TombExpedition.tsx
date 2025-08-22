import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import clsx from "clsx"
import { use, useCallback, useEffect, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { TombPuzzle } from "./TombLevel/TombPuzzle"
import { useTableauTranslations } from "@/data/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import type { TreasureTombJourney } from "@/data/journeys"
import { ComparePuzzle } from "./TombLevel/ComparePuzzle"
import { TombBackdrop } from "@/ui/TombBackdrop"
import { FezContext } from "./fez/context"

export const TombExpedition: FC<{
  activeJourney: CombinedJourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({ onClose, activeJourney, onLevelComplete, onJourneyComplete }) => {
  const { t } = useTranslation("common")
  const tableaux = useTableauTranslations()

  const journey = activeJourney.journey as TreasureTombJourney
  const { completeLevel } = useJourneys()

  const { showConversation } = use(FezContext)

  useEffect(() => {
    showConversation("tombIntro")
  }, [showConversation])

  const runTableaus = tableaux.filter(
    (tab) =>
      tab.tombJourneyId === activeJourney.journeyId &&
      tab.runNumber === activeJourney.completionCount + 1
  )
  const [completing, setCompleting] = useState(false)

  const handleLevelComplete = useCallback(() => {
    if (completing) return
    // Complete the level in the journey system
    setCompleting(true)

    setTimeout(() => {
      completeLevel()
      // Call the external level complete handler
      onLevelComplete?.()
      setCompleting(false)
    }, 500)
  }, [completeLevel, onLevelComplete, completing])

  const seed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const tableau = runTableaus[activeJourney.levelNr - 1]

  const calculation = useMemo(() => {
    const random = mulberry32(seed)
    if (!tableau) return null
    const settings = {
      amountSymbols: tableau.symbolCount,
      hieroglyphIds: tableau.inventoryIds,
      numberRange: journey.levelSettings.numberRange,
      operations: journey.levelSettings.operators,
    }
    const calc = generateRewardCalculation(settings, random)
    return calc
  }, [seed, tableau, journey.levelSettings])

  // if there are no run Tableaus, that means there is nothing to discover at this tomb anymore!
  if (tableau === undefined || calculation === null) {
    return (
      <TombBackdrop
        className="relative flex h-dvh flex-col"
        scale="small"
        zoom={completing}
        fade={completing}
        difficulty={journey.difficulty}
      >
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

  return (
    <TombBackdrop
      className="relative flex h-dvh flex-col"
      zoom={completing}
      fade={completing}
      difficulty={journey.difficulty}
    >
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
