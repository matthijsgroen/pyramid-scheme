import type { FC } from "react"
import type { Journey } from "../data/journeys"

interface JourneyCardProps {
  journey: Journey
  index: number
  showAnimation: boolean
  disabled?: boolean
  onClick: (journey: Journey) => void
}

export const JourneyCard: FC<JourneyCardProps> = ({
  journey,
  index,
  showAnimation,
  disabled = false,
  onClick,
}) => {
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
          {journey.difficulty.toUpperCase()}
        </span>
      </div>

      <div
        className={`flex items-center justify-between text-xs ${
          disabled ? "text-gray-500" : "text-amber-700"
        }`}
      >
        <span>Length: {journey.journeyLength}</span>
        {disabled && (
          <span className="font-bold">
            Prestige required: {journey.requiredPrestigeLevel}
          </span>
        )}
      </div>
    </button>
  )
}
