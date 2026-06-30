import { use, useEffect, useMemo, useRef, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { Page } from "@/ui/Page"
import { JourneyPathView } from "@/ui/JourneyPathView"
import { JourneyCard } from "@/ui/JourneyCard"
import { MapPiecePlaceholder } from "@/ui/MapPiecePlaceholder"
import { ConfirmModal } from "@/ui/ConfirmModal"
import { useJourneys } from "@/app/state/useJourneys"
import { useJourneyTranslations, type TranslatedJourney } from "@/data/useJourneyTranslations"
import { DifficultyPill } from "@/ui/DifficultyPill"
import { FezContext } from "../fez/context"

import { TableauInventory } from "./TableauInventory"
import { useProgression } from "@/app/state/useProgression"

export const TravelPage: FC<{
  startGame: () => void
  pendingHieroglyphSearch?: Difficulty | null
}> = ({ startGame, pendingHieroglyphSearch }) => {
  const { t } = useTranslation("common")
  const journeys = useJourneyTranslations()

  const { activeJourneyId, startJourney, visitLevel, cancelJourney, getJourney } = useJourneys()
  const { isTombDiscovered, mapPieceCount } = useProgression()
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState<TranslatedJourney | null>(null)
  const [showInterruptModal, setShowInterruptModal] = useState(false)
  const journeyId = activeJourneyId ?? selectedJourney?.id
  const activeJourneyInfo = journeyId ? getJourney(journeyId) : undefined

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (showJourneySelection) {
      showConversation("chooseExpedition")
    }
  }, [showJourneySelection, showConversation])

  const journey = activeJourneyInfo?.journey ?? selectedJourney

  const handleMapClick = () => {
    if (activeJourneyInfo) {
      startGame()
    } else if (selectedJourney && !activeJourneyInfo) {
      startJourney(selectedJourney)
      startGame()
    } else {
      setShowJourneySelection(true)
    }
  }

  const handleJourneySelect = (journey: TranslatedJourney) => {
    startJourney(journey)
    startGame()
  }

  const handleBackToMap = () => {
    setShowJourneySelection(false)
  }

  const handleNodeClick = (levelNr: number) => {
    if (!journey) return
    visitLevel(journey.id, levelNr)
    startGame()
  }

  const handleInterruptExpedition = () => {
    setShowInterruptModal(false)
    cancelJourney()
  }

  const handleCancelInterrupt = () => {
    setShowInterruptModal(false)
  }

  const unlocked = useMemo(() => {
    return journeys.findIndex((_j, journeyIndex) => {
      if (journeyIndex === 0) return false // Always unlock the first journey
      const previousJourneyId = journeys[journeyIndex - 1]?.id
      const hasPreviousCompleted = (getJourney(previousJourneyId)?.completionCount ?? 0) > 0
      return !hasPreviousCompleted
    })
  }, [journeys, getJourney])

  const searchHandled = useRef(false)
  useEffect(() => {
    if (pendingHieroglyphSearch && !searchHandled.current) {
      searchHandled.current = true
      setShowJourneySelection(true)
    }
  }, [pendingHieroglyphSearch])

  const suggestedJourneyId = useMemo(() => {
    if (!pendingHieroglyphSearch) return null
    const effectiveUnlocked = unlocked === -1 ? journeys.length : unlocked
    const candidates = journeys
      .filter((j, idx) => j.type === "pyramid" && j.difficulty === pendingHieroglyphSearch && idx < effectiveUnlocked)
      .sort((a, b) => (getJourney(a.id)?.completionCount ?? 0) - (getJourney(b.id)?.completionCount ?? 0))
    return candidates[0]?.id ?? null
  }, [pendingHieroglyphSearch, journeys, unlocked, getJourney])

  const hasPendingMapPieceProgress = useMemo(() => {
    return journeys
      .filter(j => j.type === "treasure_tomb" && isTombDiscovered(j.id))
      .some(j => {
        const found = mapPieceCount(j.id)
        const needed = j.type === "treasure_tomb" ? j.piecesRequired : 4
        return found > 0 && found < needed
      })
  }, [journeys, isTombDiscovered, mapPieceCount])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const suggestedCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showJourneySelection || !suggestedJourneyId) return
    const timer = setTimeout(() => {
      suggestedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 750)
    return () => clearTimeout(timer)
  }, [showJourneySelection, suggestedJourneyId])

  return (
    <Page
      className="flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-blue-100 to-blue-300 text-black"
      snap="start"
    >
      <div className="relative flex h-full w-full overflow-x-hidden">
        <div
          className={`absolute inset-0 flex w-full flex-1 flex-col pb-6 transition-all duration-700 ease-in-out md:px-16 ${
            showJourneySelection ? "translate-x-[-100%] opacity-0" : "translate-x-0 opacity-100"
          }`}
        >
          <p className="sticky top-0 mb-4 border-b-2 border-red-200 bg-amber-50 py-1 text-center text-sm text-red-600">
            This is an early <strong className="font-bold">alpha</strong> version. Expect an{" "}
            <strong className="font-bold">unbalanced experience, bugs, missing features and losing progress</strong>!
          </p>
          <h1 className="mb-4 text-center font-pyramid text-xl font-bold">{t("ui.travel")}</h1>

          {/* Map Section */}
          <div className={`flex w-full flex-col items-center px-8 pb-safe-bottom`}>
            <div className="mb-6 w-full max-w-md">
              {journey && (
                <>
                  <h3 className="mb-4 text-center font-pyramid text-xl">{journey.name}</h3>
                  <p className="mb-4 max-w-md">{journey.description}</p>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p>
                      {t("ui.length")}: {journey.lengthLabel}
                    </p>
                    {/* show difficulty pill */}
                    <DifficultyPill difficulty={journey.difficulty} label={journey.difficultyLabel} />
                  </div>
                </>
              )}
              {!journey && <p className="mb-4 text-center">{t("ui.startAdventure")}</p>}
              <JourneyPathView
                onClick={handleMapClick}
                onNodeClick={journey ? handleNodeClick : undefined}
                inJourney={!!journey}
                levelCount={journey?.levelCount ?? 1}
                levelNr={activeJourneyInfo?.levelNr ?? 1}
                journeyLength={journey?.journeyLength ?? "long"}
                type={journey?.type ?? "pyramid"}
                label={
                  activeJourneyInfo?.inProgress
                    ? t("ui.continueExpedition")
                    : selectedJourney
                      ? t("ui.startExpedition")
                      : t("ui.planExpedition")
                }
                nudge={!journey && hasPendingMapPieceProgress}
              />
              {!activeJourneyInfo && selectedJourney && (
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
              {activeJourneyInfo && (
                <div className="mt-4 text-center text-sm">
                  {t("ui.or")}{" "}
                  <button
                    onClick={() => {
                      if (activeJourneyInfo.journey.type === "treasure_tomb") {
                        handleInterruptExpedition()
                        return
                      }
                      setShowInterruptModal(true)
                    }}
                    className="mt-4 cursor-pointer bg-transparent py-2 font-bold text-blue-600 lowercase hover:text-blue-700"
                  >
                    {t("ui.interruptExpedition")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Journey Selection Section */}
        <div
          className={`absolute inset-0 flex w-full flex-col transition-all duration-700 ease-in-out ${
            showJourneySelection ? "translate-x-0 opacity-100" : "translate-x-[100%] opacity-0"
          }`}
        >
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-8">
            <div className="sticky top-0 z-10 flex w-full items-center justify-between bg-blue-100/70 px-8 py-4 backdrop-blur-sm">
              <h2 className="font-pyramid text-xl font-bold">{t("ui.chooseYourJourney")}</h2>
              <button
                onClick={handleBackToMap}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                {t("ui.backArrow")} {t("ui.backToMap")}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 pb-safe-bottom xl:grid-cols-2">
              {journeys.map((journey, index) => {
                if (journey.type === "pyramid" && index >= unlocked) {
                  // Skip pyramid journeys that are not yet unlocked
                  return null
                }
                if (
                  journey.type === "treasure_tomb" &&
                  (!isTombDiscovered(journey.id) || mapPieceCount(journey.id) === 0)
                ) {
                  return null
                }
                const journeyInfo = getJourney(journey.id)
                const completionCount = journeyInfo?.completionCount ?? 0
                const hasMapPiece = journeyInfo?.foundMapPiece ?? false
                const progressLevelNr = journeyInfo?.levelNr ?? 0

                if (journey.type === "treasure_tomb") {
                  const piecesFound = mapPieceCount(journey.id)
                  const piecesNeeded = journey.piecesRequired

                  if (piecesFound < piecesNeeded) {
                    return (
                      <MapPiecePlaceholder
                        key={journey.id}
                        piecesFound={piecesFound}
                        name={journey.name}
                        piecesNeeded={piecesNeeded}
                      />
                    )
                  }
                }
                const disabled = journey.type === "treasure_tomb" && journey.treasures.length <= completionCount

                const isSuggested = journey.id === suggestedJourneyId
                return (
                  <div key={journey.id} ref={isSuggested ? suggestedCardRef : undefined}>
                    <JourneyCard
                      showDetails={index === unlocked - 1}
                      journey={journey}
                      disabled={disabled}
                      completionCount={completionCount}
                      progressLevelNr={journeyInfo?.inProgress ? progressLevelNr : undefined}
                      index={index}
                      showAnimation={showJourneySelection}
                      hasMapPiece={hasMapPiece}
                      suggested={isSuggested}
                      onClick={handleJourneySelect}
                    >
                      {journey.type === "treasure_tomb" && journeyInfo?.inProgress ? (
                        <TableauInventory journeyInfo={journeyInfo} />
                      ) : null}
                    </JourneyCard>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showInterruptModal}
        title={t("ui.interruptExpedition")}
        message={t("ui.confirmInterruptExpedition")}
        confirmText={t("ui.interruptExpedition")}
        cancelText={t("ui.cancel")}
        onConfirm={handleInterruptExpedition}
        onCancel={handleCancelInterrupt}
      />
    </Page>
  )
}
