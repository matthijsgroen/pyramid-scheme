import type { FC } from "react"
import clsx from "clsx"
import { MapPieceIcon } from "@/ui/molecules/MapPieceIcon"

type MapPiecePlaceholderLabels = {
  treasureTomb: string
  requiresMapPieces: string
  mapPieces: string
  completeExpeditionsToUnlock: string
}

type MapPiecePlaceholderProps = {
  piecesFound: number
  piecesNeeded: number
  /** What this tomb's map gestures at, without naming it (journeys.json `mapHint`). */
  mapHint?: string
  index?: number
  showAnimation?: boolean
  labels: MapPiecePlaceholderLabels
}

// A tomb whose map is still in pieces. It deliberately does NOT name the tomb: the name arrives with
// the finished map, at the same moment the reward popup names it and Travel swaps this tile for the
// real JourneyCard. Until then it says what the popup says — a vague hint at where the map leads, and
// how much of it is gathered, in the same partial-collection visual (MapPieceIcon).
export const MapPiecePlaceholder: FC<MapPiecePlaceholderProps> = ({
  piecesFound,
  piecesNeeded,
  mapHint,
  index = 0,
  showAnimation = false,
  labels,
}) => (
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
        🗝️ {labels.treasureTomb}
      </span>
    </div>

    {/* The hint, falling back to the plain "requires map pieces" line for a tomb without one */}
    <div className="text-xs leading-relaxed text-gray-500">{mapHint || labels.requiresMapPieces}</div>

    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-medium text-gray-600">
        <MapPieceIcon progress={{ found: piecesFound, required: piecesNeeded }} size="md" />
        {labels.mapPieces}
      </span>
      <span className="font-bold text-gray-700">
        {piecesFound}/{piecesNeeded}
      </span>
    </div>

    {piecesFound < piecesNeeded && (
      <div className="mt-2 text-center text-xs text-gray-500">{labels.completeExpeditionsToUnlock}</div>
    )}
  </div>
)
