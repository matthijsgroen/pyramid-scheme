import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/Page"
import { MapButton } from "@/ui/MapButton"
import { JourneyCard } from "@/ui/JourneyCard"
import { MapPiecePlaceholder } from "@/ui/MapPiecePlaceholder"
import { ConfirmModal } from "@/ui/ConfirmModal"
import { type Journey } from "@/data/journeys"
import { useJourneys } from "@/app/state/useJourneys"
import type { ActiveJourney } from "@/game/generateJourney"
import {
  useJourneyTranslations,
  type TranslatedJourney,
} from "@/data/useJourneyTranslations"
import { DifficultyPill } from "@/ui/DifficultyPill"
import { mulberry32 } from "@/game/random"
import { TombMapButton } from "@/ui/TombMapButton"

// Simple string hash function to convert string to number
const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

const getJourneyProgress = (
  activeJourney: ActiveJourney | undefined,
  journeys: Journey[]
) => {
  if (!activeJourney) return 0
  const jny: ActiveJourney = activeJourney
  const data = journeys.find((j) => j.id === jny.journeyId)
  return Math.min((jny.levelNr - 1) / (data?.levelCount ?? 1), 1)
}

export const TravelPage: FC<{ startGame: () => void }> = ({ startGame }) => {
  const { t } = useTranslation("common")
  const journeys = useJourneyTranslations()

  const {
    activeJourney,
    startJourney,
    journeyLog,
    cancelJourney,
    nextJourneySeed,
  } = useJourneys()
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] =
    useState<TranslatedJourney | null>(null)
  const [showAbortModal, setShowAbortModal] = useState(false)

  const canceledJourney = useMemo(() => {
    return journeyLog.find(
      (j) => j.journeyId === selectedJourney?.id && j.canceled && !j.completed
    )
  }, [selectedJourney, journeyLog])
  const journeyProgress = getJourneyProgress(
    activeJourney ?? canceledJourney,
    journeys
  )

  const journey = activeJourney?.journey ?? selectedJourney
  const mapRotation = useMemo(() => {
    const journeySeed =
      (activeJourney?.randomSeed ??
        canceledJourney?.randomSeed ??
        nextJourneySeed()) + (journey?.id ? hashString(journey.id) : 0)
    const random = mulberry32(journeySeed)
    return Math.round(random() * 360)
  }, [
    activeJourney?.randomSeed,
    canceledJourney?.randomSeed,
    nextJourneySeed,
    journey?.id,
  ])

  const handleMapClick = () => {
    if (activeJourney) {
      startGame()
    } else if (selectedJourney && !activeJourney) {
      startJourney(selectedJourney)
      startGame()
    } else {
      setShowJourneySelection(true)
    }
  }

  const handleJourneySelect = (journey: TranslatedJourney) => {
    setShowJourneySelection(false)
    setSelectedJourney(journey)
  }

  const handleBackToMap = () => {
    setShowJourneySelection(false)
  }

  const handleAbortExpedition = () => {
    setShowAbortModal(false)
    cancelJourney()
  }

  const handleCancelAbort = () => {
    setShowAbortModal(false)
  }

  const unlocked = useMemo(() => {
    return journeys.findIndex((j, journeyIndex) => {
      if (j.type === "treasure_tomb") {
        return false
      }
      if (journeyIndex === 0) return false // Always unlock the first journey
      const previousJourneyId = journeys[journeyIndex - 1]?.id
      const hasPreviousCompleted = journeyLog.some(
        (log) => log.journeyId === previousJourneyId && log.completed
      )
      return !hasPreviousCompleted
    })
  }, [journeys, journeyLog])

  return (
    <Page
      className="flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-blue-100 to-blue-300"
      snap="start"
    >
      <div className="relative flex h-full w-full overflow-x-hidden">
        <div
          className={`absolute inset-0 flex w-full flex-1 flex-col py-6 transition-all duration-700 ease-in-out md:px-16 ${
            showJourneySelection
              ? "translate-x-[-100%] opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          <p className="mb-4 text-center text-sm text-gray-600">
            This is an early alpha version.{" "}
            <span className="font-bold">
              Expect bugs, missing features and losing progress!
            </span>
          </p>
          <h1 className="mb-6 text-center font-pyramid text-2xl font-bold">
            {t("ui.travel")}
          </h1>

          {/* Map Section */}
          <div className={`flex w-full flex-col items-center px-8 `}>
            <div className="mb-6 w-full max-w-md">
              {journey && (
                <>
                  <h3 className="mb-4 text-center font-pyramid text-xl">
                    {journey.name}
                  </h3>
                  <p className="mb-4 max-w-md">{journey.description}</p>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p>
                      {t("ui.length")}: {journey.lengthLabel}
                    </p>
                    {/* show difficulty pill */}
                    <DifficultyPill
                      difficulty={journey.difficulty}
                      label={journey.difficultyLabel}
                    />
                  </div>
                </>
              )}
              {!journey && (
                <p className="mb-4 text-center">{t("ui.startAdventure")}</p>
              )}
              {journey?.type === "treasure_tomb" ? (
                <TombMapButton
                  onClick={handleMapClick}
                  inJourney={!!journey}
                  corridorComplexity={journey?.journeyLength ?? "long"}
                  label={journey?.name ?? ""}
                  journeyProgress={journeyProgress}
                />
              ) : (
                <MapButton
                  onClick={handleMapClick}
                  inJourney={!!journey}
                  pathRotation={mapRotation}
                  pathLength={journey?.journeyLength ?? "long"}
                  label={
                    (activeJourney ?? canceledJourney)
                      ? t("ui.continueExpedition")
                      : selectedJourney
                        ? t("ui.startExpedition")
                        : t("ui.planExpedition")
                  }
                  journeyProgress={journeyProgress}
                />
              )}
              {!activeJourney && selectedJourney && (
                <div className="mt-4 text-center text-sm">
                  {t("ui.or")}{" "}
                  <button
                    onClick={() => {
                      setSelectedJourney(null)
                      setShowJourneySelection(true)
                    }}
                    className="mt-4 cursor-pointer bg-transparent py-2 font-bold text-blue-600 lowercase hover:text-blue-700"
                  >
                    {t("ui.selectAnotherExpedition")}
                  </button>
                </div>
              )}
              {activeJourney && (
                <div className="mt-4 text-center text-sm">
                  {t("ui.or")}{" "}
                  <button
                    onClick={() => setShowAbortModal(true)}
                    className="mt-4 cursor-pointer bg-transparent py-2 font-bold text-blue-600 lowercase hover:text-blue-700"
                  >
                    {t("ui.abortExpedition")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Journey Selection Section */}
        <div
          className={`absolute inset-0 flex w-full flex-col transition-all duration-700 ease-in-out ${
            showJourneySelection
              ? "translate-x-0 opacity-100"
              : "translate-x-[100%] opacity-0"
          }`}
        >
          <div className="flex w-full items-center justify-between px-8 py-4">
            <h2 className="font-pyramid text-xl font-bold">
              {t("ui.chooseYourJourney")}
            </h2>
            <button
              onClick={handleBackToMap}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              {t("ui.backArrow")} {t("ui.backToMap")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {journeys.slice(0, unlocked).map((journey, index) => {
                const completionCount = journeyLog.filter(
                  (j) => j.journeyId === journey.id && j.completed
                ).length
                const hasMapPiece =
                  journeyLog.filter(
                    (j) => j.journeyId === journey.id && j.foundMapPiece
                  ).length > 0
                const progressLevelNr =
                  journeyLog.find(
                    (j) =>
                      j.journeyId === journey.id && j.canceled && !j.completed
                  )?.levelNr ?? 0

                if (journey.type === "treasure_tomb") {
                  // Treasure Tombs are unlocked if all map pieces are found
                  const pyramidJourneys = journeys.filter(
                    (exp) =>
                      exp.difficulty === journey.difficulty &&
                      exp.type === "pyramid"
                  )
                  const piecesFound = pyramidJourneys.filter((journey) =>
                    journeyLog.some(
                      (log) => log.journeyId === journey.id && log.foundMapPiece
                    )
                  ).length

                  if (piecesFound < pyramidJourneys.length) {
                    return (
                      <MapPiecePlaceholder
                        key={journey.id}
                        piecesFound={piecesFound}
                        name={journey.name}
                        piecesNeeded={pyramidJourneys.length}
                      />
                    )
                  }
                }
                return (
                  <JourneyCard
                    key={journey.id}
                    showDetails={index === unlocked - 1}
                    journey={journey}
                    completionCount={completionCount}
                    progressLevelNr={progressLevelNr}
                    index={index}
                    showAnimation={showJourneySelection}
                    hasMapPiece={hasMapPiece}
                    onClick={handleJourneySelect}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showAbortModal}
        title={t("ui.abortExpedition")}
        message={t("ui.confirmAbortExpedition")}
        confirmText={t("ui.abortExpedition")}
        cancelText={t("ui.cancel")}
        onConfirm={handleAbortExpedition}
        onCancel={handleCancelAbort}
      />
    </Page>
  )
}
