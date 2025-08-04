import type { FC } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"
import { DifficultyPill } from "@/ui/DifficultyPill"

type JourneyCardProps = {
  journey: TranslatedJourney
  index: number
  showAnimation: boolean
  completionCount?: number
  progressLevelNr?: number
  hasMapPiece?: boolean
  showDetails?: boolean
  disabled?: boolean
  onClick: (journey: TranslatedJourney) => void
}

export const JourneyCard: FC<JourneyCardProps> = ({
  journey,
  index,
  showAnimation,
  progressLevelNr = 0,
  showDetails = false,
  completionCount = 0,
  disabled = false,
  hasMapPiece = false,
  onClick,
}) => {
  const { t, i18n } = useTranslation("common")

  const timeEmojis = {
    morning: "🌅",
    afternoon: "☀️",
    evening: "🌇",
    night: "🌙",
  }

  const isTreasureTomb = journey.type === "treasure_tomb"

  return (
    <button
      onClick={() => !disabled && onClick(journey)}
      disabled={disabled}
      className={clsx(
        "group flex flex-col rounded-lg border-2 p-4 text-left transition-all duration-300",
        {
          "cursor-not-allowed border-gray-300 bg-gray-100 opacity-30 contrast-75 grayscale":
            disabled,
          "border-gray-400 bg-gray-100 shadow-lg hover:scale-105 hover:border-gray-500 hover:shadow-xl":
            !disabled && isTreasureTomb,
          "border-amber-300 bg-amber-50 shadow-lg hover:scale-105 hover:border-amber-400 hover:shadow-xl":
            !disabled && !isTreasureTomb,
          "animate-slide-in-up": showAnimation,
        }
      )}
      style={{
        animationDelay: showAnimation ? `${index * 100}ms` : "0ms",
      }}
    >
      <div className="mb-2">
        <div className="float-right ml-2">
          <DifficultyPill
            difficulty={journey.difficulty}
            label={journey.difficultyLabel}
            disabled={disabled}
          />
        </div>
        <span
          className={clsx(
            "font-pyramid text-lg font-bold leading-tight break-words hyphens-auto",
            {
              "text-gray-500": disabled,
              "text-gray-700": !disabled && isTreasureTomb,
              "text-amber-900": !disabled && !isTreasureTomb,
            }
          )}
          lang={i18n.language}
        >
          {journey.type === "pyramid" && timeEmojis[journey.time]}{" "}
          {journey.name}
        </span>
        <div className="clear-both"></div>
      </div>

      <div
        className={clsx("flex items-center justify-between text-xs", {
          "text-gray-500": disabled,
          "text-gray-600": !disabled && isTreasureTomb,
          "text-amber-700": !disabled && !isTreasureTomb,
        })}
      >
        <span>
          {t("ui.length")}: {journey.lengthLabel}
        </span>
        {journey.type === "treasure_tomb" && (
          <span>
            {t("ui.chambers")}: {journey.levelCount}
          </span>
        )}
        {progressLevelNr > 0 && (
          <span className="font-bold">
            {t("ui.progressLevel")}:{" "}
            {Math.min(
              Math.max(
                Math.round(((progressLevelNr - 1) / journey.levelCount) * 100),
                0
              ),
              100
            )}
            %
          </span>
        )}
        {(completionCount > 0 || hasMapPiece) && (
          <span className="inline-flex items-center font-bold text-amber-800">
            {hasMapPiece && (
              <span className="ml-1 inline-flex items-center bg-green-800 bg-clip-text text-transparent">
                📜
              </span>
            )}{" "}
            {completionCount > 0 && (
              <>
                <span className="inline-flex size-5 scale-75 items-center justify-center rounded-full bg-green-800 p-0.5 text-xs text-white">
                  ✔︎
                </span>
                : {completionCount}{" "}
                {completionCount > 1
                  ? t("ui.timesPlural")
                  : t("ui.timesSingular")}
              </>
            )}
          </span>
        )}
      </div>
      {showDetails && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">{journey.description}</p>
        </div>
      )}
    </button>
  )
}
