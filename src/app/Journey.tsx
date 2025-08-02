import { useCallback, useEffect, useState, useRef, type FC } from "react"
import { useTranslation } from "react-i18next"
import { Level } from "@/app/PyramidLevel/Level"
import { clsx } from "clsx"
import { Backdrop } from "@/ui/Backdrop"
import { getLevelWidth } from "@/game/state"
import { dayNightCycleStep } from "@/ui/backdropSelection"
import { generateJourneyLevel } from "@/game/generateJourney"
import type { JourneyState } from "@/app/state/useJourneys"

export const Journey: FC<{
  activeJourney: JourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({
  activeJourney,
  onLevelComplete: onNextLevel,
  onJourneyComplete,
  onClose,
}) => {
  const { t } = useTranslation("common")
  const [startNextLevel, setStartNextLevel] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentLevelRef = useRef<HTMLDivElement>(null)
  const nextLevelRef = useRef<HTMLDivElement>(null)
  const futureLevelRef = useRef<HTMLDivElement>(null)

  const levelContent = generateJourneyLevel(
    activeJourney,
    activeJourney.levelNr
  )
  const nextLevelContent = generateJourneyLevel(
    activeJourney,
    activeJourney.levelNr + 1
  )
  const nextNextLevelContent = generateJourneyLevel(
    activeJourney,
    activeJourney.levelNr + 2
  )

  const width = levelContent
    ? getLevelWidth(levelContent.pyramid.floorCount)
    : 0

  const storageKey = `level-${activeJourney.journeyId}-${activeJourney.levelNr}-${activeJourney.randomSeed}`

  useEffect(() => {
    if (startNextLevel) {
      const stopTimeout = setTimeout(() => {
        setStartNextLevel(false)
        onNextLevel?.()
      }, 1000)
      return () => clearTimeout(stopTimeout)
    }
  }, [startNextLevel, onNextLevel, activeJourney.levelNr])

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
        const baseTransform = startNextLevel
          ? "translateX(25%) scale(0.2)"
          : "translateX(35%) scale(0)"
        futureLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.25}px, ${scrollY * 0.25}px) ${baseTransform}`
      }

      if (nextLevelRef.current) {
        const baseTransform = startNextLevel
          ? "translateX(0) scale(1)"
          : "translateX(25%) scale(0.2)"
        nextLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.5}px, ${scrollY * 0.5}px) ${baseTransform}`
      }

      if (currentLevelRef.current) {
        const baseTransform = startNextLevel
          ? "translateX(-200%) scale(3)"
          : "scale(1)"
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
    setTimeout(() => {
      setStartNextLevel(true)
    }, 1000)
  }, [startNextLevel])

  const expeditionCompleted =
    activeJourney.levelNr > activeJourney.journey.levelCount

  return (
    <Backdrop
      levelNr={activeJourney.levelNr}
      start={activeJourney.journey.time}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex-shrink-0 backdrop-blur-sm">
          <div
            className={clsx(
              "flex w-full items-center justify-between px-4 py-2",
              dayNightCycleStep(
                activeJourney.levelNr,
                activeJourney.journey.time
              ) < 6
                ? "text-black"
                : "text-white"
            )}
          >
            <button
              onClick={onClose}
              className="cursor-pointer text-lg font-bold focus:outline-none"
            >
              {t("ui.backArrow")}
            </button>
            <h1 className="pointer-events-none mt-0 inline-block pt-4 font-pyramid text-2xl font-bold">
              {expeditionCompleted
                ? t("ui.expeditionCompleted")
                : t("ui.expedition") +
                  ` ${t("ui.level")} ${activeJourney.levelNr}/${activeJourney.journey.levelCount}`}
            </h1>
            <span></span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex flex-1 overflow-auto overscroll-contain"
          style={{ minHeight: "100vh" }}
        >
          <div
            className="relative w-full min-w-(--level-width)"
            style={{
              "--level-width": `calc(var(--spacing) * 15 * ${width + 2})`,
              minHeight: `max(100vh, calc(var(--spacing) * 13 * ${(levelContent?.pyramid.floorCount ?? 0) + 2}))`,
            }}
          >
            <div
              ref={futureLevelRef}
              key={activeJourney.levelNr + 2}
              className="pointer-events-none absolute inset-0 flex flex-1 items-center justify-center transition-all duration-1000 ease-in-out"
              style={{
                transform: startNextLevel
                  ? "translateX(25%) scale(0.2)"
                  : "translateX(35%) scale(0)",
                filter: startNextLevel ? "blur(1px)" : "blur(2px)",
                transition: startNextLevel
                  ? "transform 1000ms ease-in-out, filter 1000ms ease-in-out"
                  : "none",
              }}
            >
              {nextNextLevelContent && (
                <Level
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
                transform: startNextLevel
                  ? "translateX(0) scale(1)"
                  : "translateX(25%) scale(0.2)",
                filter: startNextLevel ? "blur(0px)" : "blur(1px)",
                transition: startNextLevel
                  ? "transform 1000ms ease-in-out, filter 1000ms ease-in-out"
                  : "none",
              }}
            >
              {nextLevelContent && (
                <Level
                  key={activeJourney.levelNr + 1}
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
                transform: startNextLevel
                  ? "translateX(-200%) scale(3)"
                  : "scale(1)",
                transition: startNextLevel
                  ? "transform 1000ms ease-in-out"
                  : "none",
              }}
            >
              {levelContent && (
                <Level
                  key={activeJourney.levelNr}
                  storageKey={storageKey}
                  content={levelContent}
                  decorationOffset={activeJourney.randomSeed}
                  onComplete={onComplete}
                />
              )}
            </div>
            {expeditionCompleted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col rounded-lg bg-white/80 p-4 backdrop-blur-md">
                  <span className="font-pyramid text-2xl font-bold text-green-500">
                    {t("ui.expeditionCompleted")}
                  </span>
                  <button
                    className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    onClick={onJourneyComplete}
                  >
                    {t("ui.goBackToBase")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Backdrop>
  )
}
