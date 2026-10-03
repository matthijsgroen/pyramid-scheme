import type { FC } from "react"

// The way in, offered beside the explorer once his walk has finished: walking somewhere and going in
// are two acts, and this is the second one.
export const MapActionPrompt: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-amber-300/70 bg-stone-900/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-amber-100 shadow-lg"
  >
    {label}
  </button>
)
