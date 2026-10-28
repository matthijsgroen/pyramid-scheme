import type { FC, KeyboardEvent } from "react"
import { closeOnEscape, focusOnMount, trapTab } from "@/ui/atoms/dialogFocus"

export type NewChapterScreenProps = {
  title: string
  subtitle: string
  body: string
  journeyName?: string
  journeyNote?: string
  setOffLabel: string
  onSetOff?: () => void
  closeLabel: string
  onClose: () => void
}

// A new tier is open: a card over whatever is behind it (the camp), at the bottom of a phone and centred on
// a wide screen. Without a journey to offer there is no Op pad, only the close button.
export const NewChapterScreen: FC<NewChapterScreenProps> = ({
  title,
  subtitle,
  body,
  journeyName,
  journeyNote,
  setOffLabel,
  onSetOff,
  closeLabel,
  onClose,
}) => {
  const escape = closeOnEscape(onClose)
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    escape(event)
    trapTab(event)
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <section
        ref={focusOnMount}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chapter-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex w-full max-w-lg flex-col gap-3 rounded-t-[20px] bg-camp-paper px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-camp-ink outline-none lg:rounded-[20px] lg:border-2 lg:border-camp-ink lg:p-8"
      >
        <div className="text-xs font-extrabold tracking-widest text-camp-label uppercase">{subtitle}</div>
        <h1 id="new-chapter-title" className="font-pyramid text-[26px] leading-tight">
          {title}
        </h1>
        <p className="text-[15px] leading-snug text-camp-ink-soft">{body}</p>
        {journeyName && (
          <div className="flex flex-col gap-0.5 rounded-xl border-2 border-camp-ink bg-camp-card p-3">
            <span className="text-[15px] font-extrabold">{journeyName}</span>
            {journeyNote && <span className="text-[13px] text-camp-label">{journeyNote}</span>}
          </div>
        )}
        {journeyName && (
          <button
            type="button"
            onClick={onSetOff}
            className="h-13 rounded-xl bg-camp-accent text-[17px] font-extrabold text-camp-on-accent hover:bg-camp-accent-hover"
          >
            {setOffLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border-2 border-camp-ink bg-camp-card text-[15px] font-extrabold"
        >
          {closeLabel}
        </button>
      </section>
    </div>
  )
}
