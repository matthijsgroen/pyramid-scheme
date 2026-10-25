import type { FC, KeyboardEvent, ReactNode } from "react"

export type CampPopupProps = {
  title: string
  closeLabel: string
  onClose: () => void
  children?: ReactNode
}

const TITLE_ID = "camp-popup-title"

// A stable ref callback: focus moves into the popup once, when it mounts, so Escape reaches it.
const focusOnMount = (el: HTMLDivElement | null) => el?.focus()

// Everything the camp opens (journeys, collection, shop) is a popup over it: full screen on a phone, a
// large centred panel from `lg`.
export const CampPopup: FC<CampPopupProps> = ({ title, closeLabel, onClose, children }) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose()
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
        className="flex w-full flex-col bg-[#F4EAD5] pt-safe-top pb-safe-bottom text-[#2B2118] outline-none lg:max-h-full lg:max-w-4xl lg:rounded-[20px] lg:border-2 lg:border-[#2B2118] lg:py-0"
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
