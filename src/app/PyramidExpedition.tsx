import { type FC, use, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Level } from "@/app/PyramidLevel/Level"
import { LevelCompletionHandler } from "@/app/PyramidLevel/LevelCompletionHandler"
import { ExpeditionCompletionOverlay } from "@/app/PyramidExpedition/ExpeditionCompletionOverlay"
import { getNextUnlockedPyramidJourneyId } from "@/app/PyramidExpedition/utils"
import { useExpeditionFlow } from "@/app/PyramidExpedition/useExpeditionFlow"
import { useExpeditionIntro } from "@/app/PyramidExpedition/useExpeditionIntro"
import { useEntranceAnimation } from "@/app/PyramidExpedition/useEntranceAnimation"
import { useLevelParallax } from "@/app/PyramidExpedition/useLevelParallax"
import { SiteMapScreen } from "@/app/SiteMap/SiteMapScreen"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { clsx } from "clsx"
import { DesertBackdrop } from "@/ui/atoms/DesertBackdrop"
import { getLevelWidth } from "@/game/state"
import { dayNightCycleDayTime, dayNightCycleStep } from "@/ui/atoms/backdropSelection"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import { type PyramidJourney } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import type { Difficulty } from "@/data/difficultyLevels"
import { FezContext } from "./fez/context"
import { generateNewSeed, mulberry32 } from "@/game/random"
import type { PyramidLevel } from "@/game/types"
import { createFloorStartIndices } from "@/app/PyramidLevel/support"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { Header } from "@/ui/atoms/Header"

const generateExpeditionLevel = (journey: PyramidJourney, baseSeed: number, levelNr: number): PyramidLevel | null => {
  const random = mulberry32(generateNewSeed(baseSeed, levelNr))
  return generateJourneyLevel(journey, levelNr, random)
}

// Modest default exterior board size per difficulty — used only when a tomb authors no exterior.
const DEFAULT_TOMB_EXTERIOR_FLOORS: Record<Difficulty, number> = {
  starter: 3,
  junior: 3,
  expert: 4,
  master: 4,
  wizard: 5,
}

// A tomb runs through the same expedition flow as a pyramid: an exterior cross-sum board, then the
// interior site map. A tomb carries no exterior generation params of its own, so we present it as a
// single-level PyramidJourney — one exterior board whose interior is the tomb's persistent
// multi-floor site (siteConfigs[0]). The default board is synthesized from the tomb's difficulty;
// a tomb may author its own `background` to override. Tuning the exterior further is future work.
const asExteriorJourney = (journey: TranslatedJourney): PyramidJourney => {
  if (journey.type === "pyramid") return journey
  return {
    ...(journey as unknown as PyramidJourney),
    type: "pyramid",
    levelCount: 1,
    background: journey.background ?? { time: "night" },
    levelSettings: {
      startFloorCount: DEFAULT_TOMB_EXTERIOR_FLOORS[journey.difficulty],
      startNumberRange: journey.levelSettings.numberRange,
    },
    rewards: { mapPiece: { startChance: 0, chanceIncrease: 0 }, completed: { pieces: [0, 0] } },
    siteConfigs: journey.siteConfigs,
  }
}

export const PyramidExpedition: FC<{
  activeJourney: CombinedJourneyState
  runNr: number
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onStartJourney?: (journeyId: string) => void
  onClose?: () => void
}> = ({ activeJourney, onLevelComplete: onNextLevel, onJourneyComplete, onStartJourney, onClose }) => {
  const isTomb = activeJourney.journey.type === "treasure_tomb"
  // Both site types render through this one flow; a tomb is adapted into a single-level exterior
  // journey whose interior is its multi-floor site.
  const pyramidJourney = asExteriorJourney(activeJourney.journey)
  const { t } = useTranslation("common")
  const { isDevelopMode } = use(DevelopContext)
  const { setInteriorLevel } = useJourneys()
  // Ward/tomb keys held right now — what decides whether the next tier is open (journeyAvailability).
  const heldKeys = useMergedHeldKeys()
  const hasInterior = !!pyramidJourney.siteConfigs?.length
  const flow = useExpeditionFlow({
    journeyId: activeJourney.journeyId,
    levelNr: activeJourney.levelNr,
    completionCount: activeJourney.completionCount,
    interiorLevelNr: activeJourney.interiorLevelNr,
    hasInterior,
    setInteriorLevel,
    onNextLevel,
    onClose,
  })
  const { startNextLevel, levelCompleted, showingInterior } = flow
  // The board's entrance animation is only meaningful when the board is actually shown — dropping
  // straight into a restored interior skips it.
  const { entering } = useEntranceAnimation(!showingInterior)
  const { scrollContainerRef, currentLevelRef, nextLevelRef, futureLevelRef } = useLevelParallax(startNextLevel)

  const levelContent = generateExpeditionLevel(pyramidJourney, activeJourney.randomSeed, activeJourney.levelNr)
  const nextLevelContent = generateExpeditionLevel(pyramidJourney, activeJourney.randomSeed, activeJourney.levelNr + 1)
  const nextNextLevelContent = generateExpeditionLevel(
    pyramidJourney,
    activeJourney.randomSeed,
    activeJourney.levelNr + 2
  )

  const width = levelContent ? getLevelWidth(levelContent.pyramid.floorCount) : 0

  const entranceBlockId = useMemo(() => {
    if (!levelContent) return undefined
    const { floorCount, blocks } = levelContent.pyramid
    const starts = createFloorStartIndices(floorCount)
    return blocks[starts[floorCount - 1] + Math.floor(floorCount / 2)]?.id
  }, [levelContent])

  const storageKey = `level-${activeJourney.journeyId}-${activeJourney.levelNr}-${activeJourney.randomSeed}`
  const { showConversation } = use(FezContext)
  const hasBlockedBlocks = useMemo(() => {
    return levelContent?.pyramid.blocks.some(block => !block.isOpen && block.value === undefined) ?? false
  }, [levelContent])

  useExpeditionIntro({ isTomb, hasBlockedBlocks, showConversation })

  const expeditionCompleted = activeJourney.levelNr > pyramidJourney.levelCount

  // Check if a new pyramid journey is unlocked (first time completing this journey)
  const nextPyramidJourneyId =
    activeJourney.completionCount === 0 ? getNextUnlockedPyramidJourneyId(activeJourney.journeyId, heldKeys) : undefined
  const dayTime = dayNightCycleDayTime(
    activeJourney.levelNr,
    pyramidJourney.background.time,
    pyramidJourney.background.timeStepSize
  )
  const textColor =
    dayNightCycleStep(activeJourney.levelNr, pyramidJourney.background.time, pyramidJourney.background.timeStepSize) < 6
      ? "text-black"
      : "text-white"

  return (
    <DesertBackdrop
      levelNr={activeJourney.levelNr}
      start={pyramidJourney.background.time}
      timeStepSize={pyramidJourney.background.timeStepSize}
      showNile={pyramidJourney.background.showNile}
    >
      <div className="flex size-full flex-col">
        <div className="flex-shrink-0 bg-gradient-to-t from-transparent via-transparent to-black/30 backdrop-blur-sm">
          <Header className={textColor}>
            <button onClick={onClose} className="mr-3 cursor-pointer text-lg font-bold focus:outline-none">
              {t("ui.backArrow")}
            </button>
            <h1 className="pointer-events-none mt-0 inline-block  text-center font-pyramid font-bold lg:text-2xl">
              {expeditionCompleted
                ? t("ui.expeditionCompleted")
                : t("ui.expedition") + ` ${t("ui.level")} ${activeJourney.levelNr}/${pyramidJourney.levelCount}`}
            </h1>
            <span>{isDevelopMode && <DeveloperButton onClick={flow.completeLevel} label="Complete Level" />}</span>
          </Header>
        </div>

        <div ref={scrollContainerRef} className="flex max-h-dvh flex-1 overflow-auto overscroll-contain">
          <div
            className={clsx(
              "absolute bottom-4 left-4 mr-4 mb-safe-bottom hidden max-w-sm rounded-lg bg-black/10 p-4 md:bottom-10 md:left-10 mdh:block",
              textColor
            )}
          >
            <h3 className="font-pyramid text-lg">{activeJourney.journey.name}</h3>
            <p>{activeJourney.journey.description}</p>
          </div>
          <div
            className="relative w-full min-w-(--level-width)"
            style={{
              "--level-width": `calc(var(--spacing) * 15 * ${width + 2})`,
              minHeight: `min(100dvh, calc(var(--spacing) * 13 * ${(levelContent?.pyramid.floorCount ?? 0) + 2}))`,
            }}
          >
            {/* inert: these two boards are scenery. They stack in the same scroll container as the
                playable one, so leaving their inputs focusable lets a tab — or a stray programmatic
                focus — scroll the board the player is solving off-screen. */}
            <div
              ref={futureLevelRef}
              key={activeJourney.levelNr + 2}
              inert
              className="pointer-events-none absolute inset-0 flex flex-1 items-center justify-center transition-all duration-1000 ease-in-out"
              style={{
                transform: startNextLevel ? "translateX(25%) scale(0.2)" : "translateX(35%) scale(0)",
                filter: startNextLevel ? "blur(1px)" : "blur(2px)",
                transition: startNextLevel ? "transform 1000ms ease-in-out, filter 1000ms ease-in-out" : "none",
              }}
            >
              {nextNextLevelContent && (
                <Level
                  dayTime={dayTime}
                  key={activeJourney.levelNr + 2}
                  content={nextNextLevelContent}
                  decorationOffset={activeJourney.randomSeed}
                  interactive={false}
                />
              )}
            </div>
            <div
              ref={nextLevelRef}
              key={activeJourney.levelNr + 1}
              inert
              className="pointer-events-none absolute inset-0 flex flex-1 items-center justify-center transition-all duration-1000 ease-in-out"
              style={{
                transform: startNextLevel ? "translateX(0) scale(1)" : "translateX(25%) scale(0.2)",
                filter: startNextLevel ? "blur(0px)" : "blur(1px)",
                transition: startNextLevel ? "transform 1000ms ease-in-out, filter 1000ms ease-in-out" : "none",
              }}
            >
              {nextLevelContent && (
                <Level
                  key={activeJourney.levelNr + 1}
                  dayTime={dayTime}
                  content={nextLevelContent}
                  decorationOffset={activeJourney.randomSeed}
                  interactive={false}
                />
              )}
            </div>
            <div
              ref={currentLevelRef}
              key={activeJourney.levelNr}
              className={clsx(
                "absolute inset-0 flex flex-1 items-center justify-center transition-all duration-1000 ease-in-out",
                entering && "pointer-events-none"
              )}
              style={{
                transform: startNextLevel ? "translateX(-200%) scale(3)" : "scale(1)",
                transition: startNextLevel ? "transform 1000ms ease-in-out" : "none",
              }}
            >
              {levelContent && (
                <Level
                  key={activeJourney.levelNr}
                  storageKey={storageKey}
                  content={levelContent}
                  decorationOffset={activeJourney.randomSeed}
                  onComplete={flow.completeLevel}
                  dayTime={dayTime}
                  entranceBlockId={entering || levelCompleted ? entranceBlockId : undefined}
                />
              )}
            </div>
            {expeditionCompleted && (
              <ExpeditionCompletionOverlay
                onJourneyComplete={onJourneyComplete}
                onStartJourney={onStartJourney}
                newPyramidJourneyId={nextPyramidJourneyId}
                activeJourney={activeJourney}
              />
            )}
          </div>
        </div>
      </div>

      {/* Level Completion Handler */}
      {levelContent && levelCompleted && (
        <LevelCompletionHandler
          onCompletionFinished={flow.completionFinished}
          activeJourney={activeJourney}
          skipLoot={!!pyramidJourney.siteConfigs?.length}
        />
      )}

      {/* Interior: shown after pyramid is solved for V3 journeys */}
      {showingInterior && pyramidJourney.siteConfigs && (
        <div className="absolute inset-0 z-30 bg-stone-950">
          <SiteMapScreen
            key={`${activeJourney.journeyId}-${activeJourney.levelNr}-${activeJourney.completionCount}`}
            journeyId={activeJourney.journeyId}
            siteConfig={pyramidJourney.siteConfigs[activeJourney.levelNr - 1] ?? pyramidJourney.siteConfigs[0]}
            seed={activeJourney.randomSeed + activeJourney.levelNr}
            onSiteComplete={flow.interiorComplete}
            onCancel={flow.leaveInterior}
          />
        </div>
      )}
    </DesertBackdrop>
  )
}
