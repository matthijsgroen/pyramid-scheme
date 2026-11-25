import type { FC } from "react"
import { GearIcon } from "./GearIcon"

// The way to Settings during an expedition, in the corner opposite the way back.
export const SettingsButton: FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="absolute top-safe-top right-safe-right z-10 m-3 flex size-8 items-center justify-center rounded bg-stone-800/80 text-amber-200"
  >
    <GearIcon size={18} />
  </button>
)
