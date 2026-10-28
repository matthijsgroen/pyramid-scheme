import type { FC, KeyboardEvent, ReactNode } from "react"
import { closeOnEscape, focusOnMount, trapTab } from "@/ui/atoms/dialogFocus"

export type CampPopupProps = {
  title: string
  closeLabel: string
  onClose: () => void
  /** From `lg` the panel takes the full height, for content that lays itself out to it. */
  fill?: boolean
  children?: ReactNode
}

const TITLE_ID = "camp-popup-title"

// Everything the camp opens (journeys, collection, shop) is a popup over it: an inset panel on a phone that
// takes the height inside the safe edges, a large centred panel from `lg`. The camp shows through it, blurred.
export const CampPopup: FC<CampPopupProps> = ({ title, closeLabel, onClose, fill = false, children }) => {
  const escape = closeOnEscape(onClose)
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    escape(event)
    trapTab(event)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:items-center lg:p-4">
      <div
        ref={focusOnMount}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`flex min-h-0 w-full flex-col overflow-hidden rounded-[18px] border-2 border-camp-ink bg-camp-glass-solid text-camp-ink outline-none supports-backdrop-filter:bg-camp-glass supports-backdrop-filter:backdrop-blur-md ${fill ? "lg:h-full" : ""} lg:max-h-full lg:max-w-4xl lg:rounded-[20px]`}
      >
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-camp-rule pr-0.5 pl-4 lg:border-b-0 lg:pl-6">
          <h2 id={TITLE_ID} className="font-pyramid text-[22px] lg:text-2xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full hover:bg-black/5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              aria-hidden
              className="stroke-camp-ink"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2 lg:px-4 lg:pb-4">{children}</div>
      </div>
    </div>
  )
}
