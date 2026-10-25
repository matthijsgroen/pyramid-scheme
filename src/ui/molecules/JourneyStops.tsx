import type { FC, ReactNode } from "react"
import { NoticeDot } from "@/ui/atoms/NoticeDot"

export type JourneyStop = {
  n: number
  label: string
  /** done: behind the player, can be visited; ahead: not reached; buried: reached but closed off. */
  state: "done" | "ahead" | "buried"
  dot?: boolean
  dotLabel?: string
}

export type JourneyStopsProps = {
  stops: JourneyStop[]
  onStop: (n: number) => void
  /** What the mods put under the stops. */
  children?: ReactNode
}

const CHIP = "flex min-h-11 items-center gap-2 rounded-[10px] border-2 px-2.5 text-left text-sm font-bold"

// The sites of a journey, numbered. Only a stop already passed is a button; one ahead or buried is shown
// but cannot be entered.
export const JourneyStops: FC<JourneyStopsProps> = ({ stops, onStop, children }) => (
  <div className="flex flex-col gap-2 text-[#2B2118]">
    <ol className="flex flex-wrap gap-2">
      {stops.map(stop => {
        const inner = (
          <>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${stop.state === "done" ? "bg-[#A3401A] text-[#FFF8EA]" : "bg-[#E9DCBF] text-[#5C4A36]"}`}
            >
              {stop.n}
            </span>
            <span>{stop.label}</span>
            {stop.dot && <NoticeDot label={stop.dotLabel} />}
          </>
        )
        return (
          <li key={stop.n}>
            {stop.state === "done" ? (
              <button type="button" onClick={() => onStop(stop.n)} className={`${CHIP} border-[#D6C4A0] bg-[#FFF8EA]`}>
                {inner}
              </button>
            ) : (
              <span
                className={`${CHIP} border-dashed border-[#B8A584] text-[#5C4A36] ${stop.state === "buried" ? "opacity-60" : ""}`}
              >
                {inner}
              </span>
            )}
          </li>
        )
      })}
    </ol>
    {children}
  </div>
)
