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
        className="flex w-full max-w-lg flex-col gap-3 rounded-t-[20px] bg-[#F4EAD5] px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#2B2118] outline-none lg:rounded-[20px] lg:border-2 lg:border-[#2B2118] lg:p-8"
      >
        <div className="text-xs font-extrabold tracking-widest text-[#5C4A36] uppercase">{subtitle}</div>
        <h1 id="new-chapter-title" className="font-serif text-[26px] leading-tight font-bold">
          {title}
        </h1>
        <p className="text-[15px] leading-snug text-[#4A3B2A]">{body}</p>
        {journeyName && (
          <div className="flex flex-col gap-0.5 rounded-xl border-2 border-[#2B2118] bg-[#FFF8EA] p-3">
            <span className="text-[15px] font-extrabold">{journeyName}</span>
            {journeyNote && <span className="text-[13px] text-[#5C4A36]">{journeyNote}</span>}
          </div>
        )}
        {journeyName && (
          <button
            type="button"
            onClick={onSetOff}
            className="h-13 rounded-xl bg-[#A3401A] text-[17px] font-extrabold text-[#FFF8EA] hover:bg-[#8A3515]"
          >
            {setOffLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border-2 border-[#2B2118] bg-[#FFF8EA] text-[15px] font-extrabold"
        >
          {closeLabel}
        </button>
      </section>
    </div>
  )
}
