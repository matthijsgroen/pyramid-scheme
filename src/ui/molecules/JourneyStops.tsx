import type { FC, ReactNode } from "react"
import { NoticeDot } from "@/ui/atoms/NoticeDot"

export type JourneyStop = {
  n: number
  /** done: behind the player, can be visited; ahead: not reached; buried: reached but closed off. */
  state: "done" | "ahead" | "buried"
  dot?: boolean
  dotLabel?: string
}

export type JourneyStopsProps = {
  /** What every stop is ("Piramide"), said once before the numbers and in each stop's name. */
  label: string
  stops: JourneyStop[]
  onStop: (n: number) => void
  /** What the mods put under the stops. */
  children?: ReactNode
}

const CHIP = "relative flex size-11 items-center justify-center rounded-full border-2 text-sm font-extrabold"

// The sites of a journey: their kind once, then one numbered stop each, so a long journey stays one
// short row. Only a stop already passed is a button; one ahead or buried is shown but cannot be entered.
export const JourneyStops: FC<JourneyStopsProps> = ({ label, stops, onStop, children }) => (
  <div className="flex flex-col gap-2 text-camp-ink">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold">{label}</span>
      <ol className="flex flex-wrap gap-2">
        {stops.map(stop => {
          const inner = (
            <>
              {stop.n}
              {stop.dot && (
                <span className="absolute -top-0.5 -right-0.5 flex rounded-full ring-2 ring-camp-card">
                  <NoticeDot label={stop.dotLabel} />
                </span>
              )}
            </>
          )
          return (
            <li key={stop.n}>
              {stop.state === "done" ? (
                <button
                  type="button"
                  aria-label={`${label} ${stop.n}`}
                  onClick={() => onStop(stop.n)}
                  className={`${CHIP} border-camp-accent bg-camp-accent text-camp-on-accent`}
                >
                  {inner}
                </button>
              ) : (
                <span
                  aria-label={`${label} ${stop.n}`}
                  className={`${CHIP} border-dashed border-camp-dashed text-camp-label ${stop.state === "buried" ? "opacity-60" : ""}`}
                >
                  {inner}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
    {children}
  </div>
)
