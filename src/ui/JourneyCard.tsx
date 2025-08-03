import type { FC } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"
import { DifficultyPill } from "@/ui/DifficultyPill"

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
      <div className="mb-2 flex items-center justify-between">
        <span
          className={clsx("font-pyramid text-lg font-bold", {
            "text-gray-500": disabled,
            "text-gray-700": !disabled && isTreasureTomb,
            "text-amber-900": !disabled && !isTreasureTomb,
          })}
        >
          {journey.type === "pyramid" && timeEmojis[journey.time]}{" "}
          {journey.name}
        </span>
        <DifficultyPill
          difficulty={journey.difficulty}
          label={journey.difficultyLabel}
          disabled={disabled}
        />
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
