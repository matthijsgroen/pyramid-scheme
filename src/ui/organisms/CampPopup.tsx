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

// Everything the camp opens (journeys, collection, shop) is a popup over it: full screen on a phone, a
// large centred panel from `lg`.
export const CampPopup: FC<CampPopupProps> = ({ title, closeLabel, onClose, fill = false, children }) => {
  const escape = closeOnEscape(onClose)
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    escape(event)
    trapTab(event)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 lg:items-center lg:p-10">
      <div
        ref={focusOnMount}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`flex w-full flex-col bg-[#F4EAD5] pt-safe-top pb-safe-bottom text-[#2B2118] outline-none ${fill ? "lg:h-full" : ""} lg:max-h-full lg:max-w-4xl lg:rounded-[20px] lg:border-2 lg:border-[#2B2118] lg:py-0`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <h2 id={TITLE_ID} className="font-serif text-xl font-bold lg:text-2xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#2B2118] bg-[#FFF8EA] text-lg font-extrabold"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 lg:px-6 lg:pb-6">{children}</div>
      </div>
    </div>
  )
}
