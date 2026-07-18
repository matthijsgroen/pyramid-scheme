import { use, useEffect, useMemo, useRef, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/atoms/Page"
import { JourneyPathView } from "@/ui/atoms/JourneyPathView"
import { JourneyCard } from "@/ui/organisms/JourneyCard"
import { MapPiecePlaceholder } from "@/ui/atoms/MapPiecePlaceholder"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { useJourneys } from "@/app/state/useJourneys"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useJourneyTranslations, type TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { DifficultyPill } from "@/ui/atoms/DifficultyPill"
import { FezContext } from "../fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"

import { TableauInventory } from "./TableauInventory"
import { useTombTreasureProgress } from "@/mods/tombTreasure/app/useTombTreasureProgress"

export const TravelPage: FC<{
  startGame: () => void
}> = ({ startGame }) => {
  const { t, i18n } = useTranslation("common")
  const journeys = useJourneyTranslations()

  const { activeJourneyId, startJourney, visitLevel, cancelJourney, getJourney, getOutstandingHiddenCorridorCount } =
    useJourneys()
  // A completed journey (completionCount > 0) is in revisit/explore mode: selecting it from the grid
  // lands on the map (not the game) so the player picks which pyramid to re-enter.
  const isRevisit = (journeyId: string) => (getJourney(journeyId)?.completionCount ?? 0) > 0
  // Corridor detector L4 (§7.2): only the top detector level surfaces the world-wide marker.
  const corridorDetectorLevel = useMergedDetectorLevels().corridor
  const { isTombDiscovered, mapPieceCount, hasMapPiece: hasFoundMapPiece } = useTombTreasureProgress()
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState<TranslatedJourney | null>(null)
  const [showInterruptModal, setShowInterruptModal] = useState(false)
  const journeyId = activeJourneyId ?? selectedJourney?.id
  const activeJourneyInfo = journeyId ? getJourney(journeyId) : undefined

  const { showConversation } = use(FezContext)
  const { isDevelopMode } = use(DevelopContext)
  const shopTombJourney = journeys.find(j => j.id === "junior_treasure_tomb")

  useEffect(() => {
    if (showJourneySelection) {
      showConversation("chooseExpedition")
    }
  }, [showJourneySelection, showConversation])

  const journey = activeJourneyInfo?.journey ?? selectedJourney
  // A tomb is played as a SINGLE-level exterior journey (its multi-floor interior is one site), so
  // its effective exterior level count is always 1 — regardless of the raw multi-floor `levelCount`
  // (2–5). Re-entry must resume a tomb at level 1: resuming at its raw levelCount (where a completed
  // tomb's stored levelNr sits) makes the expedition read `levelNr > 1` as "already complete" and
  // immediately end the journey, blocking re-entry (PyramidExpedition's expeditionCompleted guard).
  const effectiveLevelCount = journey?.type === "treasure_tomb" ? 1 : (journey?.levelCount ?? 1)
  // Revisit/explore: a completed journey (completionCount > 0). Every pyramid stays a pickable node
  // even while one is open, so drive the path view past the last level regardless of stored levelNr.
  const revisiting = !!journey && (activeJourneyInfo?.completionCount ?? 0) > 0
  const pathLevelNr = revisiting && journey ? effectiveLevelCount + 1 : (activeJourneyInfo?.levelNr ?? 1)

  const handleMapClick = () => {
    if (revisiting && journey) {
      // Tapping the map background (not a node) re-enters the last-picked pyramid, re-solving its
      // exterior board (visitLevel clears the interior).
      const info = getJourney(journey.id)
      const resumeAt = info && info.levelNr >= 1 && info.levelNr <= effectiveLevelCount ? info.levelNr : 1
      visitLevel(journey.id, resumeAt)
      startGame()
    } else if (activeJourneyInfo?.inProgress) {
      startGame()
    } else {
      setShowJourneySelection(true)
    }
  }

  const handleJourneySelect = (journey: TranslatedJourney) => {
    if (isRevisit(journey.id)) {
      // Don't jump in — return to the map with the journey loaded so the player picks a pyramid.
      setSelectedJourney(journey)
      setShowJourneySelection(false)
      return
    }
    startJourney(journey)
    startGame()
  }

  const handleBackToMap = () => {
    setShowJourneySelection(false)
  }

  const handleNodeClick = (levelNr: number) => {
    if (!journey) return
    // A tomb has a single exterior level; every "node" re-enters that one site (see effectiveLevelCount).
    visitLevel(journey.id, journey.type === "treasure_tomb" ? 1 : levelNr)
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
            <strong className="font-bold">July 2026 redesign:</strong> this is a{" "}
            <strong className="font-bold">completely new game</strong> — currently testing the skeleton. Expect missing
            content, rough edges, and save resets.
          </p>
          <h1 className="mb-4 text-center font-pyramid text-xl font-bold">{t("ui.travel")}</h1>
          {isDevelopMode && shopTombJourney && (
            <div className="mb-4 flex justify-center">
              <DeveloperButton onClick={() => handleJourneySelect(shopTombJourney)} label="Jump to Shop Tomb" />
            </div>
          )}

          {/* Map Section */}
          <div className={`flex w-full flex-col items-center px-8 pb-safe-bottom`}>
            <div className="mb-6 w-full max-w-md">
              {journey && (
                <>
                  <h3 className="mb-4 text-center font-pyramid text-xl">{journey.name}</h3>
                  <p className="mb-4 max-w-md">{journey.description}</p>
                  <div className="mb-4 flex items-center justify-end gap-2">
                    <DifficultyPill difficulty={journey.difficulty} label={journey.difficultyLabel} />
                  </div>
                </>
              )}
              {!journey && <p className="mb-4 text-center">{t("ui.startAdventure")}</p>}
              <JourneyPathView
                onClick={handleMapClick}
                onNodeClick={journey ? handleNodeClick : undefined}
                inJourney={!!journey}
                levelCount={effectiveLevelCount}
                levelNr={pathLevelNr}
                journeyLength={journey?.journeyLength ?? "long"}
                type={journey?.type ?? "pyramid"}
                label={
                  revisiting
                    ? journey?.type === "treasure_tomb"
                      ? t("ui.revisitTomb")
                      : t("ui.revisitExpedition")
                    : activeJourneyInfo?.inProgress
                      ? t("ui.continueExpedition")
                      : t("ui.planExpedition")
                }
                nudge={!journey && hasPendingMapPieceProgress}
              />
              {revisiting && (
                <div className="mt-4 text-center text-sm">
                  {t("ui.or")}{" "}
                  <button
                    onClick={() => {
                      if (activeJourneyId) cancelJourney()
                      setSelectedJourney(null)
                      setShowJourneySelection(true)
                    }}
                    className="mt-4 cursor-pointer bg-transparent py-2 font-bold text-blue-600 lowercase hover:text-blue-700"
                  >
                    {t("ui.selectAnotherExpedition")}
                  </button>
                </div>
              )}
              {!revisiting && activeJourneyInfo?.inProgress && (
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
                const hasMapPiece = hasFoundMapPiece(journey.id)
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
                        labels={{
                          treasureTomb: t("ui.treasureTomb"),
                          requiresMapPieces: t("ui.requiresMapPieces"),
                          mapPieces: t("ui.mapPieces"),
                          collected: t("ui.collected"),
                          completeExpeditionsToUnlock: t("ui.completeExpeditionsToUnlock"),
                        }}
                      />
                    )
                  }
                }
                return (
                  <JourneyCard
                    key={journey.id}
                    showDetails={index === unlocked - 1}
                    journey={journey}
                    disabled={false}
                    completionCount={completionCount}
                    progressLevelNr={journeyInfo?.inProgress ? progressLevelNr : undefined}
                    index={index}
                    showAnimation={showJourneySelection}
                    hasMapPiece={hasMapPiece}
                    hasUnexploredCorridors={
                      corridorDetectorLevel >= 4 && getOutstandingHiddenCorridorCount(journey.id) > 0
                    }
                    lang={i18n.language}
                    labels={{
                      chambers: t("ui.chambers"),
                      progressLevel: t("ui.progressLevel"),
                    }}
                    onClick={handleJourneySelect}
                  >
                    {journey.type === "treasure_tomb" && journeyInfo?.inProgress ? (
                      <TableauInventory journeyInfo={journeyInfo} />
                    ) : null}
                  </JourneyCard>
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
