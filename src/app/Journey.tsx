import { useCallback, useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { Level } from "./PyramidLevel/Level"
import { clsx } from "clsx"
import { Backdrop } from "../ui/Backdrop"
import { getLevelWidth } from "../game/state"
import { dayNightCycleStep } from "../ui/backdropSelection"
import { generateJourneyLevel } from "../game/generateJourney"
import type { JourneyState } from "./state/useJourneys"

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

  const onComplete = useCallback(() => {
    if (startNextLevel) return
    setTimeout(() => {
      setStartNextLevel(true)
    }, 1000)
  }, [startNextLevel])

  const expeditionCompleted =
    activeJourney.levelNr > activeJourney.journey.levelCount

  return (
    <Backdrop levelNr={activeJourney.levelNr}>
      <div className="flex w-full flex-1 overflow-scroll overscroll-contain">
        <div
          className="relative h-full min-h-(--level-height) w-full min-w-(--level-width)"
          style={{
            "--level-width": `calc(var(--spacing) * 15 * ${width + 2})`,
            "--level-height": `calc(var(--spacing) * 10 * ${(levelContent?.pyramid.floorCount ?? 0) + 2})`,
          }}
        >
          <div
            key={activeJourney.levelNr + 2}
            className={clsx(
              "pointer-events-none absolute inset-0 flex flex-1 items-center justify-center transition-transform duration-1000 ease-in-out",
              startNextLevel
                ? "translate-x-[25%] scale-20 blur-xs"
                : "translate-x-[35%] scale-0 blur-sm"
            )}
          >
            {nextNextLevelContent && (
              <Level
                key={activeJourney.levelNr + 2}
                content={nextNextLevelContent}
              />
            )}
          </div>
          <div
            key={activeJourney.levelNr + 1}
            className={clsx(
              "pointer-events-none absolute inset-0 flex flex-1 items-center justify-center transition-transform duration-1000 ease-in-out",
              startNextLevel
                ? "translate-x-0 scale-100 blur-none"
                : "translate-x-[25%] scale-20 blur-xs"
            )}
          >
            {nextLevelContent && (
              <Level
                key={activeJourney.levelNr + 1}
                content={nextLevelContent}
              />
            )}
          </div>
          <div
            key={activeJourney.levelNr}
            className={clsx(
              "absolute inset-0 flex flex-1 items-center justify-center transition-transform duration-1000 ease-in-out",
              startNextLevel ? "translate-x-[-200%] scale-300" : "scale-100"
            )}
          >
            {levelContent && (
              <Level
                key={activeJourney.levelNr}
                storageKey={storageKey}
                content={levelContent}
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
      <div className="absolute top-0 right-0 left-0">
        <div className="flex w-full items-center justify-between px-4 py-2">
          <button
            onClick={onClose}
            className="cursor-pointer text-lg font-bold focus:outline-none"
          >
            {t("ui.backArrow")}
          </button>
          <h1
            className={clsx(
              "pointer-events-none mt-0  inline-block pt-4 font-pyramid text-2xl font-bold",
              dayNightCycleStep(activeJourney.levelNr) < 6
                ? "text-black"
                : "text-white"
            )}
          >
            {expeditionCompleted
              ? t("ui.expeditionCompleted")
              : t("ui.expedition") +
                ` ${t("ui.level")} ${activeJourney.levelNr}/${activeJourney.journey.levelCount}`}
          </h1>
          <span></span>
        </div>
      </div>
    </Backdrop>
  )
}
