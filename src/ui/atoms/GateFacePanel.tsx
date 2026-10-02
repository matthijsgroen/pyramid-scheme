import type { FC, ReactNode } from "react"
import clsx from "clsx"

export type GateFaceMarker = {
  id: string
  /** The owner's own icon, drawn by the caller. */
  icon: ReactNode
  lit: boolean
  /** What the marker says to a screen reader, lit or not. */
  label: string
}

type GateFacePanelProps = {
  title: string
  hint: string
  markers: readonly GateFaceMarker[]
  turnAroundLabel: string
  onTurnAround: () => void
}

// What a door waits for: one marker per owner, bright once that owner has been worked and dim until then.
// It only offers to turn around — nothing here can open the door.
export const GateFacePanel: FC<GateFacePanelProps> = ({ title, hint, markers, turnAroundLabel, onTurnAround }) => (
  <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
    <p className="font-pyramid text-2xl text-amber-300">{title}</p>
    <p className="max-w-xs text-center text-sm text-stone-400 italic">{hint}</p>
    <ul className="flex flex-wrap items-center justify-center gap-4">
      {markers.map(marker => (
        <li
          key={marker.id}
          aria-label={marker.label}
          data-lit={marker.lit}
          className={clsx(
            "flex size-16 items-center justify-center rounded-full border-2 text-4xl",
            marker.lit
              ? "border-amber-300 bg-amber-900/60 shadow-[0_0_14px_rgba(252,211,77,0.6)]"
              : "border-stone-600 bg-stone-900 opacity-40 grayscale"
          )}
        >
          {marker.icon}
        </li>
      ))}
    </ul>
    <button onClick={onTurnAround} className="text-sm text-stone-400 hover:text-stone-200">
      {turnAroundLabel}
    </button>
  </div>
)
