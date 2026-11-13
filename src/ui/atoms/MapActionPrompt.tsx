import type { FC, ReactNode } from "react"

// The way in, offered beside the explorer once his walk has finished: walking somewhere and going in
// are two acts, and this is the second one. `glyph` is the key or pad button that takes it, for keys and pad.
export const MapActionPrompt: FC<{ label: string; onClick: () => void; glyph?: ReactNode }> = ({
  label,
  onClick,
  glyph,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-stone-900/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-amber-100 shadow-lg"
  >
    {glyph}
    {label}
  </button>
)
