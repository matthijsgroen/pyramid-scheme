import type { FC } from "react"

export const FloorBadge: FC<{ label: string }> = ({ label }) => (
  <div className="absolute top-safe-top right-safe-right z-10 m-3 rounded bg-stone-800 px-3 py-1 text-sm text-amber-200">
    {label}
  </div>
)
