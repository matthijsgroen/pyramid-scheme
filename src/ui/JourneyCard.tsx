import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"

interface JourneyCardProps {
  journey: TranslatedJourney
  index: number
  showAnimation: boolean
  completionCount?: number
  disabled?: boolean
  onClick: (journey: TranslatedJourney) => void
}

export const JourneyCard: FC<JourneyCardProps> = ({
  journey,
  index,
  showAnimation,
  completionCount = 0,
  disabled = false,
  onClick,
}) => {
  const { t } = useTranslation("common")
  const difficultyColors = {
    easy: "bg-green-100 border-green-300 text-green-800",
    medium: "bg-yellow-100 border-yellow-300 text-yellow-800",
    hard: "bg-red-100 border-red-300 text-red-800",
  }

  const timeEmojis = {
    morning: "🌅",
    afternoon: "☀️",
    evening: "🌇",
    night: "🌙",
  }

  return (
    <button
      onClick={() => !disabled && onClick(journey)}
      disabled={disabled}
      className={`group flex flex-col rounded-lg border-2 p-4 text-left transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed border-gray-300 bg-gray-100 opacity-30 contrast-75 grayscale"
          : "border-amber-300 bg-amber-50 shadow-lg hover:scale-105 hover:border-amber-400 hover:shadow-xl"
      } ${showAnimation ? "animate-slide-in-up" : ""}`}
      style={{
        animationDelay: showAnimation ? `${index * 100}ms` : "0ms",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`font-pyramid text-lg font-bold ${
            disabled ? "text-gray-500" : "text-amber-900"
          }`}
        >
          {timeEmojis[journey.time]} {journey.name}
        </span>
        <span
          className={`rounded-full border px-2 py-1 text-xs font-bold ${
            disabled
              ? "border-gray-400 bg-gray-200 text-gray-600"
              : difficultyColors[journey.difficulty]
          }`}
        >
          {journey.difficultyLabel.toUpperCase()}
        </span>
      </div>

      <div
        className={`flex items-center justify-between text-xs ${
          disabled ? "text-gray-500" : "text-amber-700"
        }`}
      >
        <span>
          {t("ui.length")}: {journey.lengthLabel}
        </span>
        {disabled && (
          <span className="font-bold">
            {t("ui.requiredPrestige")}: {journey.requiredPrestigeLevel}
          </span>
        )}
        {completionCount > 0 && (
          <span className="inline-flex items-center font-bold text-amber-800">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-800 p-0.5 text-sm text-white">
              ✔︎
            </span>
            : {completionCount}{" "}
            {completionCount > 1 ? t("ui.timesPlural") : t("ui.timesSingular")}
          </span>
        )}
      </div>
    </button>
  )
}
