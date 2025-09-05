import { useCallback, useEffect, useState, useRef, type FC, use, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Level } from "@/app/PyramidLevel/Level"
import { LevelCompletionHandler } from "@/app/PyramidLevel/LevelCompletionHandler"
import { ExpeditionCompletionOverlay } from "@/app/PyramidExpedition/ExpeditionCompletionOverlay"
import { getNextUnlockedPyramidJourneyId } from "@/app/PyramidExpedition/utils"
import { clsx } from "clsx"
import { DesertBackdrop } from "@/ui/DesertBackdrop"
import { getLevelWidth } from "@/game/state"
import { dayNightCycleDayTime, dayNightCycleStep } from "@/ui/backdropSelection"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import { type PyramidJourney } from "@/data/journeys"
import { FezContext } from "./fez/context"
import { generateNewSeed, mulberry32 } from "@/game/random"
import type { PyramidLevel } from "@/game/types"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/DeveloperButton"
import { Header } from "@/ui/Header"

const generateExpeditionLevel = (activeJourney: CombinedJourneyState, levelNr: number): PyramidLevel | null => {
  const randomSeed = generateNewSeed(activeJourney.randomSeed, levelNr)
  const random = mulberry32(randomSeed)

  const journey = activeJourney.journey
  if (journey.type !== "pyramid") {
    return null
  }
  return generateJourneyLevel(journey, levelNr, random)
}

export const PyramidExpedition: FC<{
  activeJourney: CombinedJourneyState
  runNr: number
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({ activeJourney, runNr, onLevelComplete: onNextLevel, onJourneyComplete, onClose }) => {
  const { t } = useTranslation("common")
  const { isDevelopMode } = use(DevelopContext)
  const [transitionToLevel, setTransitionToLevel] = useState(activeJourney.levelNr)
  const [levelCompleted, setLevelCompleted] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentLevelRef = useRef<HTMLDivElement>(null)
  const nextLevelRef = useRef<HTMLDivElement>(null)
  const futureLevelRef = useRef<HTMLDivElement>(null)
  const startNextLevel = transitionToLevel > activeJourney.levelNr

  const levelContent = generateExpeditionLevel(activeJourney, activeJourney.levelNr)
  const nextLevelContent = generateExpeditionLevel(activeJourney, activeJourney.levelNr + 1)
  const nextNextLevelContent = generateExpeditionLevel(activeJourney, activeJourney.levelNr + 2)

  const width = levelContent ? getLevelWidth(levelContent.pyramid.floorCount) : 0

  const storageKey = `level-${activeJourney.journeyId}-${activeJourney.levelNr}-${activeJourney.randomSeed}`
  const { showConversation } = use(FezContext)
  const hasBlockedBlocks = useMemo(() => {
    return levelContent?.pyramid.blocks.some(block => !block.isOpen && block.value === undefined) ?? false
  }, [levelContent])

  useEffect(() => {
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) {
      showConversation("pyramidBlockedBlocks")
    }
  }, [showConversation, hasBlockedBlocks])

  // Handle scroll for parallax effect with direct DOM manipulation
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrollX = scrollContainer.scrollLeft
      const scrollY = scrollContainer.scrollTop

      // Update transforms directly via refs for better performance
      // Only apply parallax when not transitioning levels
      if (futureLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(25%) scale(0.2)" : "translateX(35%) scale(0)"
        futureLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.25}px, ${scrollY * 0.25}px) ${baseTransform}`
      }

      if (nextLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(0) scale(1)" : "translateX(25%) scale(0.2)"
        nextLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.5}px, ${scrollY * 0.5}px) ${baseTransform}`
      }

      if (currentLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(-200%) scale(3)" : "scale(1)"
        currentLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * -0.1}px, ${scrollY * -0.1}px) ${baseTransform}`
      }
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })

    // Initial call to set transforms
    handleScroll()

    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [startNextLevel])

  const onComplete = useCallback(() => {
    if (startNextLevel) return
    setLevelCompleted(true)
  }, [startNextLevel])

  const onCompletionFinished = useCallback(() => {
    setLevelCompleted(false)
    setTimeout(() => {
      // setStartNextLevel(true)
      setTransitionToLevel(activeJourney.levelNr + 1)
    }, 1000)
    setTimeout(() => {
      // setStartNextLevel(false)
    }, 2000)
    setTimeout(() => {
      onNextLevel?.()
    }, 1995)
  }, [onNextLevel, activeJourney.levelNr])

  // Early return if not a pyramid journey
  if (activeJourney.journey.type !== "pyramid") {
    return null
  }

  // Cast to PyramidJourney since we've confirmed the type
  const pyramidJourney = activeJourney.journey as PyramidJourney

  const expeditionCompleted = activeJourney.levelNr > pyramidJourney.levelCount

  // Check if a new pyramid journey is unlocked
  const nextPyramidJourneyId = runNr === 0 ? getNextUnlockedPyramidJourneyId(activeJourney.journeyId) : undefined
  const dayTime = dayNightCycleDayTime(
    activeJourney.levelNr,
    pyramidJourney.background.time,
    pyramidJourney.background.timeStepSize
  )
  const textColor =
    dayNightCycleStep(
      activeJourney.levelNr,
      pyramidJourney.background.time,
      activeJourney.journey.background.timeStepSize
    ) < 6
      ? "text-black"
      : "text-white"

  return (
    <DesertBackdrop
      levelNr={activeJourney.levelNr}
      start={pyramidJourney.background.time}
      timeStepSize={pyramidJourney.background.timeStepSize}
      showNile={pyramidJourney.background.showNile}
    >
      <div className="flex h-full w-full flex-col">
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
            <span>
              {isDevelopMode && (
                <DeveloperButton
                  onClick={() => {
                    onComplete()
                  }}
                  label="Complete Level"
                />
              )}
            </span>
          </Header>
        </div>

        <div ref={scrollContainerRef} className="flex max-h-dvh flex-1 overflow-auto overscroll-contain">
          <div
            className={clsx(
              "absolute bottom-4 left-4 mr-4 hidden max-w-sm rounded-lg bg-black/10 p-4 md:bottom-10 md:left-10 mdh:block",
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
              minHeight: `max(100dvh, calc(var(--spacing) * 13 * ${(levelContent?.pyramid.floorCount ?? 0) + 2}))`,
            }}
          >
            <div
              ref={futureLevelRef}
              key={activeJourney.levelNr + 2}
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
                />
              )}
            </div>
            <div
              ref={nextLevelRef}
              key={activeJourney.levelNr + 1}
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
                />
              )}
            </div>
            <div
              ref={currentLevelRef}
              key={activeJourney.levelNr}
              className="absolute inset-0 flex flex-1 items-center justify-center transition-all duration-1000 ease-in-out"
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
                  onComplete={onComplete}
                  dayTime={dayTime}
                />
              )}
            </div>
            {expeditionCompleted && (
              <ExpeditionCompletionOverlay
                onJourneyComplete={onJourneyComplete}
                newPyramidJourneyId={nextPyramidJourneyId}
                activeJourney={activeJourney}
              />
            )}
          </div>
        </div>
      </div>

      {/* Level Completion Handler */}
      {levelContent && levelCompleted && (
        <LevelCompletionHandler onCompletionFinished={onCompletionFinished} activeJourney={activeJourney} />
      )}
    </DesertBackdrop>
  )
}
