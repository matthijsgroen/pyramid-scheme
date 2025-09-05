import type { FC, PropsWithChildren } from "react"
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

export const JourneyCard: FC<PropsWithChildren<JourneyCardProps>> = ({
  children,
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
      className={clsx("group flex flex-row rounded-lg border-l-0 text-left transition-all duration-300 contain-paint", {
        "cursor-not-allowed border-gray-300 bg-gray-100 opacity-30 contrast-75 grayscale": disabled,
        "border-gray-400 bg-gray-100 shadow-lg hover:scale-105 hover:border-gray-500 hover:shadow-xl":
          !disabled && isTreasureTomb,
        "border-amber-300 bg-amber-50 shadow-lg hover:scale-105 hover:border-amber-400 hover:shadow-xl":
          !disabled && !isTreasureTomb,
        "animate-slide-in-up": showAnimation,
      })}
      style={{
        animationDelay: showAnimation ? `${index * 100}ms` : "0ms",
      }}
    >
      <div
        className={clsx(
          "h-full w-4 flex-shrink-0",
          journey.difficulty === "starter" && "bg-stone-500",
          journey.difficulty === "junior" && "bg-gradient-to-b from-orange-300 to-orange-400",
          journey.difficulty === "expert" && "bg-gradient-to-b from-slate-200 to-slate-400",
          journey.difficulty === "master" && "bg-gradient-to-b from-yellow-200 to-yellow-400",
          journey.difficulty === "wizard" && "bg-gradient-to-b from-emerald-200 to-emerald-500"
        )}
      ></div>
      <div
        className={clsx("flex-1 flex-col rounded-r-lg border-2 border-l-0 py-3 pr-3 pl-1", {
          "cursor-not-allowed border-gray-300 bg-gray-100 opacity-30 contrast-75 grayscale": disabled,
          "border-gray-400 bg-gray-100 shadow-lg hover:border-gray-500 hover:shadow-xl": !disabled && isTreasureTomb,
          "border-amber-300 bg-amber-50 shadow-lg hover:border-amber-400 hover:shadow-xl": !disabled && !isTreasureTomb,
        })}
      >
        <div className="mb-2">
          <div className="float-right ml-2">
            <DifficultyPill difficulty={journey.difficulty} label={journey.difficultyLabel} disabled={disabled} />
          </div>
          <span
            className={clsx("font-pyramid text-lg leading-tight font-bold break-words hyphens-auto", {
              "text-gray-500": disabled,
              "text-gray-700": !disabled && isTreasureTomb,
              "text-amber-900": !disabled && !isTreasureTomb,
            })}
            lang={i18n.language}
          >
            {journey.type === "pyramid" && timeEmojis[journey.background.time]} {journey.name}
          </span>
          <div className="clear-both"></div>
        </div>

        <div
          className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", {
            "text-gray-500": disabled,
            "text-gray-600": !disabled && isTreasureTomb,
            "text-amber-700": !disabled && !isTreasureTomb,
          })}
        >
          <span className="flex-shrink-0">
            {t("ui.length")}: {journey.lengthLabel}
          </span>
          {journey.type === "treasure_tomb" && (
            <span className="flex-shrink-0">
              {t("ui.chambers")}: {journey.levelCount}
            </span>
          )}
          {progressLevelNr > 0 && (
            <span className="flex-shrink-0 font-bold">
              {t("ui.progressLevel")}:{" "}
              {Math.min(Math.max(Math.round(((progressLevelNr - 1) / journey.levelCount) * 100), 0), 100)}%
            </span>
          )}
          {(completionCount > 0 || hasMapPiece) && (
            <span className="ml-auto inline-flex items-center font-bold text-amber-800">
              {hasMapPiece && (
                <span className="ml-1 inline-flex items-center bg-green-800 bg-clip-text text-transparent">📜</span>
              )}{" "}
              {completionCount > 0 && (
                <>
                  <span className="inline-flex size-5 scale-75 items-center justify-center rounded-full bg-green-800 p-0.5 text-xs text-white">
                    ✔︎
                  </span>
                  : {completionCount} {completionCount > 1 ? t("ui.timesPlural") : t("ui.timesSingular")}
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
        {children}
      </div>
    </button>
  )
}
