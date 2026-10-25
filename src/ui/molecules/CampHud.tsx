import type { FC, ReactNode } from "react"

export type CampHudProps = {
  title: string
  onTitleTap: () => void
  /** Taps still needed on the title; shown as "n…" only for the last three. */
  tapsLeft?: number
  devBadge?: string
  settingsLabel: string
  onSettings: () => void
  /** The widgets (coins, hearts, …) the app puts on the right, before the gear. */
  children?: ReactNode
}

// The camp's top bar: the title on the left (a button, since tapping it counts toward a hidden unlock),
// the widgets and a gear on the right.
export const CampHud: FC<CampHudProps> = ({
  title,
  onTitleTap,
  tapsLeft,
  devBadge,
  settingsLabel,
  onSettings,
  children,
}) => (
  <header className="flex h-14 items-center justify-between bg-[#27304A]/90 px-4 text-[#F4EAD5] lg:h-16 lg:px-7">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onTitleTap}
        className="font-serif text-[22px] font-bold tracking-wide select-none lg:text-[26px]"
      >
        {title}
        {tapsLeft !== undefined && tapsLeft >= 1 && tapsLeft <= 3 && (
          <span className="ml-2 text-sm font-normal text-[#C9CFE2]">{tapsLeft}…</span>
        )}
      </button>
      {devBadge && (
        <span className="rounded bg-[#A3401A] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-[#FFF8EA]">
          {devBadge}
        </span>
      )}
    </div>
    <div className="flex items-center gap-3.5 lg:gap-5">
      {children}
      <button
        type="button"
        aria-label={settingsLabel}
        onClick={onSettings}
        className="flex size-9 items-center justify-center rounded-full text-[#F4EAD5] hover:bg-white/10"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      </button>
    </div>
  </header>
)
