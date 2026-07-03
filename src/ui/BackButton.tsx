import type { FC } from "react"

export const BackButton: FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="absolute top-safe-top left-safe-left z-10 m-3 rounded bg-stone-800/80 px-3 py-1 text-sm text-amber-200"
  >
    {label}
  </button>
)
