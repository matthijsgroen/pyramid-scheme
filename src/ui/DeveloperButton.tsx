import type { FC } from "react"

export const DeveloperButton: FC<{ onClick?: () => void; label: string }> = ({
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className="rounded-md bg-red-600 p-2 text-white transition-all hover:scale-105 active:scale-95"
  >
    {label}
  </button>
)
