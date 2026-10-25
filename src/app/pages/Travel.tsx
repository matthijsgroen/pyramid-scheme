import { use, useMemo, useRef, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { JourneyPathView } from "@/ui/atoms/JourneyPathView"
import { JourneyCard } from "@/ui/organisms/JourneyCard"
import { LockedJourneyCard } from "@/ui/organisms/LockedJourneyCard"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { useJourneys } from "@/app/state/useJourneys"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useJourneyTranslations, type TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { DifficultyPill } from "@/ui/atoms/DifficultyPill"
import { TapHint } from "@/ui/atoms/TapHint"
import { useTapHint } from "@/app/state/useTapHint"
import { FezContext } from "@/app/fez/context"

import { journeyCardSlots } from "./journeyCardSlots"
import "@/mods/registerModApps" // populate the journey-card slot registry, as Collection does for its sections
import { comingSoonDifficulty } from "./journeyAvailability"
import { useAvailableJourneyIds } from "./useAvailableJourneyIds"
import { useMergedJourneyContributions } from "./journeyContributions"
import { isWebKey } from "@/game/floorLock"

export const TravelPage: FC<{
  startGame: () => void
}> = ({ startGame }) => {
  const { t, i18n } = useTranslation("common")
  const journeys = useJourneyTranslations()

  const {
    activeJourneyId,
    startJourney,
    visitLevel,
    cancelJourney,
    getJourney,
    getOutstandingHiddenCorridorCount,
    getUnexploredLevels,
  } = useJourneys()
  // Ward/tomb keys the player currently holds — a newly-earned one re-lights a completed pyramid
  // that has a matching unopened ward door (getUnexploredLevels re-checks against this).
  const heldKeys = useMergedHeldKeys()
  // A completed journey (completionCount > 0) is in revisit/explore mode: selecting it from the grid
  // lands on the map (not the game) so the player picks which pyramid to re-enter.
  const isRevisit = (journeyId: string) => (getJourney(journeyId)?.completionCount ?? 0) > 0
  // Corridor detector L4: only the top detector level surfaces the world-wide marker.
  const corridorDetectorLevel = useMergedDetectorLevels().corridor
  // What the mods say about each journey: still locked (and how far along), not on the map yet, or
  // holding something of theirs the player already found.
  const journeyFacts = useMergedJourneyContributions()
  // A pointing hand waits for the conversation to end, so one thing at a time asks for the player's eye.
  const { speaking } = use(FezContext)
  const [mapHint, mapTapped] = useTapHint("travelMap")
  const [journeyHint, journeyTapped] = useTapHint("firstJourney")
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState<TranslatedJourney | null>(null)
  const [showInterruptModal, setShowInterruptModal] = useState(false)
  const journeyId = activeJourneyId ?? selectedJourney?.id
  const activeJourneyInfo = journeyId ? getJourney(journeyId) : undefined

  const journey = activeJourneyInfo?.journey ?? selectedJourney
  // Nodes on this journey's map: one per site; a tomb is a journey of levelCount sites.
  const effectiveLevelCount = journey?.levelCount ?? 1
  // Revisit/explore: a completed journey (completionCount > 0). Every pyramid stays a pickable node
  // even while one is open, so drive the path view past the last level regardless of stored levelNr.
  const revisiting = !!journey && (activeJourneyInfo?.completionCount ?? 0) > 0
  const pathLevelNr = revisiting && journey ? effectiveLevelCount + 1 : (activeJourneyInfo?.levelNr ?? 1)

  const handleMapClick = async () => {
    mapTapped()
    if (revisiting && journey) {
      // Tapping the map card (not a node) resumes a finished journey at its last level, whatever level
      // it stopped on; node taps still pick any level. visitLevel re-solves the exterior board and
      // clears the interior.
      const resumeAt = effectiveLevelCount
      // Awaited: the expedition must not mount until every useJourneys() instance can see the
      // level we're heading to, or it seeds its transition animation from the level we're leaving.
      await visitLevel(journey.id, resumeAt)
      startGame()
    } else if (activeJourneyInfo?.inProgress) {
      startGame()
    } else {
      setShowJourneySelection(true)
    }
  }

  const handleJourneySelect = async (journey: TranslatedJourney) => {
    journeyTapped()
    if (isRevisit(journey.id)) {
      // Don't jump in — return to the map with the journey loaded so the player picks a pyramid.
      setSelectedJourney(journey)
      setShowJourneySelection(false)
      return
    }
    await startJourney(journey)
    startGame()
  }

  const handleBackToMap = () => {
    setShowJourneySelection(false)
  }

  const handleNodeClick = async (levelNr: number) => {
    if (!journey) return
    // Each node is one site (see effectiveLevelCount). Awaited — see handleMapClick.
    await visitLevel(journey.id, levelNr)
    startGame()
  }

  const handleInterruptExpedition = () => {
    setShowInterruptModal(false)
    cancelJourney()
  }

  const handleCancelInterrupt = () => {
    setShowInterruptModal(false)
  }

  const availableJourneyIds = useAvailableJourneyIds(journeys)
  const comingSoonTier = comingSoonDifficulty(heldKeys)

  // The newest one open to the player — the card that shows its details expanded.
  const newestAvailableId = useMemo(
    () => journeys.filter(j => availableJourneyIds.has(j.id)).at(-1)?.id,
    [journeys, availableJourneyIds]
  )

  // The first card in the list: the one the hand points at before the player has picked any journey.
  const firstPickableId = journeys.find(j => availableJourneyIds.has(j.id) && !journeyFacts.hidden(j.id))?.id

  // A lock the player has started but not finished is worth a nudge back onto the map.
  const hasPendingLockProgress = journeys.some(j => {
    const lock = journeyFacts.lock(j.id)
    return !!lock && lock.found > 0 && lock.found < lock.required
  })

  // Pyramids of the currently-shown journey that still hold unvisited content. Not gated on
  // `revisiting`: a pyramid you finished mid-journey is a completed node too, so its dot shows as
  // soon as you move past it. The pyramid you're currently in lights only for what a web key pulled since
  // it was saved opened there (a never-visited one has no save, so it cannot): its own open content is
  // what you are about to play.
  const mapUnexploredNodes = useMemo(() => {
    if (!journey) return new Set<number>() as ReadonlySet<number>
    const nodes = new Set(getUnexploredLevels(journey.id, heldKeys))
    nodes.delete(pathLevelNr)
    for (const level of getUnexploredLevels(journey.id, heldKeys, isWebKey)) if (level === pathLevelNr) nodes.add(level)
    return nodes as ReadonlySet<number>
  }, [journey, getUnexploredLevels, heldKeys, pathLevelNr])
  const buriedNodes = journey ? journeyFacts.buried(journey.id) : undefined

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex size-full min-h-[70dvh] flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-blue-100 to-blue-300 text-black">
      <div className="relative flex size-full overflow-x-hidden">
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
              <TapHint show={mapHint && !journey && !speaking}>
                <JourneyPathView
                  onClick={handleMapClick}
                  onNodeClick={journey ? handleNodeClick : undefined}
                  inJourney={!!journey}
                  levelCount={effectiveLevelCount}
                  levelNr={pathLevelNr}
                  journeyLength={journey?.journeyLength ?? "long"}
                  exterior={journey?.exterior ?? "pyramid"}
                  label={
                    revisiting
                      ? journey?.exterior === "tomb"
                        ? t("ui.revisitTomb")
                        : t("ui.revisitExpedition")
                      : activeJourneyInfo?.inProgress
                        ? t("ui.continueExpedition")
                        : t("ui.planExpedition")
                  }
                  nudge={!journey && hasPendingLockProgress}
                  unexploredNodes={mapUnexploredNodes}
                  buriedNodes={buriedNodes}
                />
              </TapHint>
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
                      if (activeJourneyInfo.journey.exterior === "tomb") {
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
                if (!journey.entryLock && !availableJourneyIds.has(journey.id)) {
                  // Skip pyramid journeys the player cannot pick yet
                  return null
                }
                if (journeyFacts.hidden(journey.id)) {
                  return null
                }
                const journeyInfo = getJourney(journey.id)
                const completionCount = journeyInfo?.completionCount ?? 0
                const mark = journeyFacts.mark(journey.id)
                const progressLevelNr = journeyInfo?.levelNr ?? 0
                const lock = journeyFacts.lock(journey.id)

                if (lock && lock.found < lock.required) {
                  return (
                    <LockedJourneyCard
                      key={journey.id}
                      found={lock.found}
                      required={lock.required}
                      hint={journey.mapHint}
                      labels={lock.labels}
                    />
                  )
                }
                return (
                  <TapHint key={journey.id} show={journeyHint && !speaking && journey.id === firstPickableId}>
                    <JourneyCard
                      showDetails={journey.id === newestAvailableId}
                      journey={journey}
                      disabled={false}
                      completionCount={completionCount}
                      progressLevelNr={journeyInfo?.inProgress ? progressLevelNr : undefined}
                      index={index}
                      showAnimation={showJourneySelection}
                      mark={mark}
                      hasUnexploredCorridors={
                        corridorDetectorLevel >= 4 && getOutstandingHiddenCorridorCount(journey.id) > 0
                      }
                      hasReachableUnexplored={completionCount > 0 && getUnexploredLevels(journey.id, heldKeys).size > 0}
                      lang={i18n.language}
                      labels={{
                        progressLevel: t("ui.progressLevel"),
                      }}
                      onClick={() => handleJourneySelect(journey)}
                    >
                      {journeyInfo
                        ? journeyCardSlots().map(({ id, Component }) => (
                            <Component key={id} journeyInfo={journeyInfo} />
                          ))
                        : null}
                    </JourneyCard>
                  </TapHint>
                )
              })}
              {comingSoonTier && (
                <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-left">
                  <div className="mb-2 font-pyramid text-lg font-bold text-amber-800">
                    🚧 {t("ui.tierComingSoonTitle", { tier: t(`difficulty.${comingSoonTier}`) })}
                  </div>
                  <p className="text-sm text-amber-900">
                    {t("ui.tierComingSoon", { tier: t(`difficulty.${comingSoonTier}`) })}
                  </p>
                </div>
              )}
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
    </div>
  )
}
