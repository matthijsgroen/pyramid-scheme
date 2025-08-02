import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/Page"
import { MapButton } from "@/ui/MapButton"
import { JourneyCard } from "@/ui/JourneyCard"
import { ConfirmModal } from "@/ui/ConfirmModal"
import { type Journey } from "@/data/journeys"
import { useJourneys } from "@/app/state/useJourneys"
import type { ActiveJourney } from "@/game/generateJourney"
import {
  useJourneyTranslations,
  type TranslatedJourney,
} from "@/data/useJourneyTranslations"

const getJourneyProgress = (
  activeJourney: ActiveJourney | undefined,
  journeys: Journey[]
) => {
  if (!activeJourney) return 0
  const jny: ActiveJourney = activeJourney
  const data = journeys.find((j) => j.id === jny.journeyId)
  return Math.min(jny.levelNr / (data?.levelCount ?? 1), 1)
}

export const TravelPage: FC<{ startGame: () => void }> = ({ startGame }) => {
  const { t } = useTranslation("common")
  const [prestige] = useState(0)
  const journeys = useJourneyTranslations()

  const { activeJourney, startJourney, journeyLog, cancelJourney } =
    useJourneys()
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] =
    useState<TranslatedJourney | null>(null)
  const [showAbortModal, setShowAbortModal] = useState(false)
  const journeyProgress = getJourneyProgress(activeJourney, journeys)

  const journey = activeJourney?.journey ?? selectedJourney

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

  return (
    <Page
      className="flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300"
      snap="start"
    >
      <div className="flex w-full flex-1 flex-col overflow-y-auto py-6 md:px-16">
        <h1 className="mb-6 text-center font-pyramid text-2xl font-bold">
          {t("ui.travel")}
        </h1>

        <div className="relative flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
          {/* Map Section */}
          <div
            className={`absolute inset-0 flex w-full flex-col items-center px-8 transition-all duration-700 ease-in-out ${
              showJourneySelection
                ? "translate-x-[-100%] opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <div className="w-full max-w-md">
              {journey && (
                <>
                  <h3 className="mb-4 text-center font-pyramid text-xl">
                    {journey.name}
                  </h3>
                  <p className="mb-4 max-w-md">{journey.description}</p>
                  <p className="mb-4 max-w-md">
                    {t("ui.length")}: {journey.lengthLabel}
                  </p>
                </>
              )}
              {!journey && (
                <p className="mb-4 text-center">{t("ui.startAdventure")}</p>
              )}
              <MapButton
                onClick={handleMapClick}
                inJourney={!!journey}
                label={
                  activeJourney
                    ? t("ui.continueExpedition")
                    : selectedJourney
                      ? t("ui.startExpedition")
                      : t("ui.planExpedition")
                }
                journeyProgress={journeyProgress}
              />
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

          {/* Journey Selection Section */}
          <div
            className={`absolute inset-0 flex w-full flex-col transition-all duration-700 ease-in-out ${
              showJourneySelection
                ? "translate-x-0 opacity-100"
                : "translate-x-[100%] opacity-0"
            }`}
          >
            <div className="mb-4 flex w-full items-center justify-between px-8">
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
                {journeys
                  .filter(
                    (journey) => journey.requiredPrestigeLevel <= prestige
                  )
                  .map((journey, index) => {
                    const completionCount = journeyLog.filter(
                      (j) => j.journeyId === journey.id && j.completed
                    ).length
                    return (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        completionCount={completionCount}
                        disabled={prestige < journey.requiredPrestigeLevel}
                        index={index}
                        showAnimation={showJourneySelection}
                        onClick={handleJourneySelect}
                      />
                    )
                  })}
              </div>
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
