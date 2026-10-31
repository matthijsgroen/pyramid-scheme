import type { FC, ReactNode } from "react"
import { GearIcon } from "@/ui/atoms/GearIcon"

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
  <header className="flex h-14 items-center justify-between bg-camp-night/90 px-4 text-camp-paper lg:h-16 lg:px-7">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onTitleTap}
        className="font-pyramid text-[22px] tracking-wide select-none lg:text-[26px]"
      >
        {title}
        {tapsLeft !== undefined && tapsLeft >= 1 && tapsLeft <= 3 && (
          <span className="ml-2 text-sm font-normal text-camp-on-night">{tapsLeft}…</span>
        )}
      </button>
      {devBadge && (
        <span className="rounded bg-camp-accent px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-camp-on-accent">
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
        className="flex size-9 items-center justify-center rounded-full text-camp-paper hover:bg-white/10"
      >
        <GearIcon size={22} />
      </button>
    </div>
  </header>
)
