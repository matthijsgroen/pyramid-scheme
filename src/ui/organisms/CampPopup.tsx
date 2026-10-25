import type { CSSProperties, FC, KeyboardEvent, ReactNode } from "react"
import { closeOnEscape, focusOnMount, trapTab } from "@/ui/atoms/dialogFocus"

export type CampPopupProps = {
  title: string
  closeLabel: string
  onClose: () => void
  /** From `lg` the panel takes the full height, for content that lays itself out to it. */
  fill?: boolean
  /** Pixels the camp's HUD takes under the safe area; on a phone the panel starts below it. */
  hudHeight?: number
  children?: ReactNode
}

const TITLE_ID = "camp-popup-title"
const DEFAULT_HUD_HEIGHT = 72

// Everything the camp opens (journeys, collection, shop) is a popup over it: an inset panel on a phone, so
// the camp stays in view behind it, a large centred panel from `lg`.
export const CampPopup: FC<CampPopupProps> = ({
  title,
  closeLabel,
  onClose,
  fill = false,
  hudHeight = DEFAULT_HUD_HEIGHT,
  children,
}) => {
  const escape = closeOnEscape(onClose)
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    escape(event)
    trapTab(event)
  }
  const insets = {
    "--popup-top": `calc(env(safe-area-inset-top, 0px) + ${hudHeight}px)`,
    "--popup-bottom": "calc(env(safe-area-inset-bottom, 0px) + 40px)",
  } as CSSProperties
  return (
    <div
      style={insets}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 px-4 pt-(--popup-top) pb-(--popup-bottom) lg:items-center lg:p-10"
    >
      <div
        ref={focusOnMount}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`flex min-h-0 w-full flex-col overflow-hidden rounded-[18px] border-2 border-[#2B2118] bg-[#F4EAD5] text-[#2B2118] outline-none ${fill ? "lg:h-full" : ""} lg:max-h-full lg:max-w-4xl lg:rounded-[20px]`}
      >
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-[#D6C4A0] py-2.5 pr-3 pl-4 lg:border-b-0 lg:px-6 lg:py-3">
          <h2 id={TITLE_ID} className="font-pyramid text-[22px] lg:text-2xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-[#E9DCBF] lg:size-10 lg:border-2 lg:border-[#2B2118] lg:bg-[#FFF8EA]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B2118" strokeWidth="2.5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-3.5 pt-3 pb-3.5 lg:px-6 lg:pt-0 lg:pb-6">{children}</div>
      </div>
    </div>
  )
}
