import type { FC, ReactNode } from "react"

export type ContinueCardProps = {
  heading: string
  journeyName?: string
  detail?: string
  setOffLabel: string
  onSetOff?: () => void
  emptyText?: string
  /** Without `onOpen` the row is a plain note. */
  hint?: { text: string; onOpen?: () => void }
  /** Lets the app wrap the Op pad button (e.g. in a tap hint). */
  setOffSlot?: (button: ReactNode) => ReactNode
}

// "Verder met": the journey to go on with, the big set-off button and an optional
// hint row. Without a journey there is nothing to set off on, so only the empty text shows.
export const ContinueCard: FC<ContinueCardProps> = ({
  heading,
  journeyName,
  detail,
  setOffLabel,
  onSetOff,
  emptyText,
  hint,
  setOffSlot,
}) => {
  const setOff = (
    <button
      type="button"
      onClick={onSetOff}
      className="h-13 w-full rounded-xl bg-camp-accent px-4 text-[17px] font-extrabold text-camp-on-accent hover:bg-camp-accent-hover"
    >
      {setOffLabel}
    </button>
  )
  return (
    <div className="flex flex-col gap-3 text-camp-ink">
      <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-camp-ink bg-camp-card p-4 max-lg:bg-camp-glass-solid max-lg:supports-backdrop-filter:bg-camp-glass max-lg:supports-backdrop-filter:backdrop-blur-lg max-lg:supports-backdrop-filter:backdrop-saturate-160 lg:p-[18px]">
        <div className="text-xs font-extrabold tracking-widest text-camp-label uppercase">{heading}</div>
        {journeyName ? (
          <>
            <div className="flex flex-col gap-0.5">
              <div className="font-pyramid text-lg lg:text-xl">{journeyName}</div>
              {detail && <div className="text-sm text-camp-label">{detail}</div>}
            </div>
            {setOffSlot ? setOffSlot(setOff) : setOff}
          </>
        ) : (
          emptyText && <div className="text-[15px] text-camp-ink-soft">{emptyText}</div>
        )}
      </div>
      {hint &&
        (hint.onOpen ? (
          <button
            type="button"
            onClick={hint.onOpen}
            className="flex items-center gap-2.5 rounded-xl bg-camp-chip px-3 py-2.5 text-left text-sm"
          >
            <span className="size-2.5 flex-none rounded-full bg-faience-600" />
            <span>{hint.text}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl bg-camp-chip px-3 py-2.5 text-sm">
            <span className="size-2.5 flex-none rounded-full bg-faience-600" />
            <span>{hint.text}</span>
          </div>
        ))}
    </div>
  )
}
