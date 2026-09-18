import type { FC } from "react"
import clsx from "clsx"
import { MapPieceIcon } from "@/ui/molecules/MapPieceIcon"

type LockedJourneyLabels = {
  /** What kind of place this is, since its name is still unknown. */
  title: string
  /** The line to fall back on when the journey has no hint of its own. */
  requires: string
  /** What one of the things the lock counts is called. */
  unit: string
  /** What to go and do to find more of them. */
  howToUnlock: string
}

type LockedJourneyCardProps = {
  found: number
  required: number
  /** What this journey gestures at, without naming it (journeys.json `mapHint`). */
  hint?: string
  index?: number
  showAnimation?: boolean
  labels: LockedJourneyLabels
}

// A journey the player cannot enter yet, standing in for its card until the lock opens. It
// deliberately does NOT name the journey: the name arrives with the last piece of the lock, at the
// same moment the reward popup names it and Travel swaps this tile for the real JourneyCard. Until
// then it says what the popup says — a vague hint at where it leads, and how much of the lock is
// gathered. The progress visual is the torn-map one, the only lock in the game so far.
export const LockedJourneyCard: FC<LockedJourneyCardProps> = ({
  found,
  required,
  hint,
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
        🗝️ {labels.title}
      </span>
    </div>

    <div className="text-xs leading-relaxed text-gray-500">{hint || labels.requires}</div>

    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-medium text-gray-600">
        <MapPieceIcon progress={{ found, required }} size="md" />
        {labels.unit}
      </span>
      <span className="font-bold text-gray-700">
        {found}/{required}
      </span>
    </div>

    {found < required && <div className="mt-2 text-center text-xs text-gray-500">{labels.howToUnlock}</div>}
  </div>
)
