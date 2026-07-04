import type { FC } from "react"

export const ActionButton: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-700"
  >
    {label}
  </button>
)
