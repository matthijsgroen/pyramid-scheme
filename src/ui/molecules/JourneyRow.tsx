import type { FC, ReactNode } from "react"
import { NoticeDot } from "@/ui/atoms/NoticeDot"

export type JourneyRowNeed = { label: string; symbols?: { symbol: string; held: boolean }[] }

export type JourneyRowProps = {
  name: string
  note?: string
  /** current: the one being walked ("NU"); open: can be started; finished: can be re-entered; locked: cannot. */
  status: "current" | "open" | "finished" | "locked"
  exterior: "pyramid" | "tomb"
  /** "NU" */
  currentLabel: string
  dot?: boolean
  dotLabel?: string
  /** A mod's small mark at the end of the row. */
  mark?: string
  /** What a locked row waits for. */
  needs?: JourneyRowNeed[]
  /** The desktop list: no icon tile, the note on the same line. */
  compact?: boolean
  onOpen?: () => void
  /** The chevron that opens the sites. */
  stops?: { label: string; open: boolean; onToggle: () => void }
  /** What the mods say about the journey, under the row whether or not it has sites to open. */
  details?: ReactNode
  /** The opened sites, under the row. */
  children?: ReactNode
}

const Icon: FC<{ status: JourneyRowProps["status"]; exterior: JourneyRowProps["exterior"] }> = ({
  status,
  exterior,
}) => {
  const current = status === "current"
  const tile = current
    ? "bg-[#A3401A]"
    : status === "locked"
      ? "border-2 border-dashed border-[#B8A584]"
      : "bg-[#E9DCBF]"
  const fill = current ? "#FFF8EA" : "#7B5B3A"
  return (
    <span aria-hidden className={`flex size-10 flex-none items-center justify-center rounded-lg ${tile}`}>
      {status === "locked" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C4A36" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      ) : exterior === "tomb" ? (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M5 21V10a7 7 0 0 1 14 0v11z" fill={fill} />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <polygon points="2,20 12,5 22,20" fill={fill} />
        </svg>
      )}
    </span>
  )
}

// One journey in the all-journeys list. The row is a button to go there; the chevron beside it is its own
// button, so it opens the sites without going. A locked row is no button at all, only what it waits for.
export const JourneyRow: FC<JourneyRowProps> = ({
  name,
  note,
  status,
  exterior,
  currentLabel,
  dot,
  dotLabel,
  mark,
  needs,
  compact = false,
  onOpen,
  stops,
  details,
  children,
}) => {
  const locked = status === "locked"
  const frame = locked
    ? "border-dashed border-[#B8A584] bg-transparent"
    : status === "current"
      ? "border-[#A3401A] bg-[#FFF8EA]"
      : "border-[#D6C4A0] bg-[#FFF8EA]"
  const body = (
    <>
      {!compact && <Icon status={status} exterior={exterior} />}
      <span className={`flex min-w-0 flex-1 ${compact ? "items-center gap-2" : "flex-col gap-0.5"}`}>
        <span className={`text-[15px] font-extrabold ${compact ? "flex-1" : ""}`}>{name}</span>
        {note && <span className="text-[13px] text-[#5C4A36]">{note}</span>}
      </span>
      {status === "current" && <span className="text-xs font-extrabold text-[#A3401A]">{currentLabel}</span>}
      {mark && <span className="text-xs font-extrabold text-[#5C4A36]">{mark}</span>}
      {dot && <NoticeDot label={dotLabel} />}
      {status === "finished" && !dot && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3F6B2E" strokeWidth="3" aria-hidden>
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
    </>
  )
  const grid = `flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left ${compact ? "px-3 py-2.5" : "p-3"}`
  return (
    <div
      aria-disabled={locked || undefined}
      className={`rounded-xl border-2 text-[#2B2118] ${compact ? "rounded-[10px]" : ""} ${frame}`}
    >
      <div className="flex items-center">
        {locked ? (
          <div className={grid}>{body}</div>
        ) : (
          <button type="button" onClick={onOpen} className={grid}>
            {body}
          </button>
        )}
        {stops && (
          <button
            type="button"
            aria-expanded={stops.open}
            aria-label={stops.label}
            onClick={stops.onToggle}
            className="flex size-11 flex-none items-center justify-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C4A36"
              strokeWidth="3"
              aria-hidden
              className={stops.open ? "rotate-90" : ""}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
      {locked && needs && needs.length > 0 && (
        <ul className={`flex flex-col gap-1.5 pb-3 ${compact ? "px-3" : "px-[14px]"}`}>
          {needs.map(need => (
            <li key={need.label} className="flex flex-wrap items-center gap-2 text-[13px] text-[#4A3B2A]">
              <span>{need.label}</span>
              {need.symbols?.map(({ symbol, held }) => (
                <span
                  key={symbol}
                  data-held={held}
                  className={`flex size-8 items-center justify-center rounded-md border-2 text-lg ${held ? "border-[#A3401A] bg-[#FFF8EA]" : "border-dashed border-[#B8A584] opacity-40"}`}
                >
                  {symbol}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {!locked && details && <div className="px-3 pb-3">{details}</div>}
      {stops?.open && children && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
