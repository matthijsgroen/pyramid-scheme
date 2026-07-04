import type { FC } from "react"
import clsx from "clsx"

type MapPiecePlaceholderLabels = {
  treasureTomb: string
  requiresMapPieces: string
  mapPieces: string
  collected: string
  completeExpeditionsToUnlock: string
}

type MapPiecePlaceholderProps = {
  piecesFound: number
  piecesNeeded: number
  name: string
  index?: number
  showAnimation?: boolean
  labels: MapPiecePlaceholderLabels
}

export const MapPiecePlaceholder: FC<MapPiecePlaceholderProps> = ({
  piecesFound,
  piecesNeeded,
  name,
  index = 0,
  showAnimation = false,
  labels,
}) => {
  const progressPercentage = Math.round((piecesFound / piecesNeeded) * 100)

  return (
    <div
      className={clsx(
        "group flex flex-col rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-left opacity-60 transition-all duration-300",
        {
          "animate-slide-in-up": showAnimation,
        }
      )}
      style={{
        animationDelay: showAnimation ? `${index * 100}ms` : "0ms",
      }}
    >
      <div className="mb-2">
        <span className="font-pyramid text-lg leading-tight font-bold break-words hyphens-auto text-gray-500">
          🗝️ {piecesFound > 0 ? name : labels.treasureTomb}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{labels.requiresMapPieces}</span>
      </div>

      {/* Map Pieces Progress */}
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-600">📜 {labels.mapPieces}</span>
          <span className="font-bold text-gray-700">
            {piecesFound}/{piecesNeeded}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="text-center text-xs font-medium text-gray-600">
          {progressPercentage}% {labels.collected}
        </div>
      </div>

      {piecesFound < piecesNeeded && (
        <div className="mt-2 text-center text-xs text-gray-500">{labels.completeExpeditionsToUnlock}</div>
      )}
    </div>
  )
}
