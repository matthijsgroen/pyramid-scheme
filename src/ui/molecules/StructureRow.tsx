import type { FC } from "react"
import { NewBadge } from "@/ui/atoms/NewBadge"

/** `newLabel` marks a part the player has not seen yet. */
export type StructureRowPart = { id: string; name?: string; iconUrl?: string; newLabel?: string }

export type StructureRowProps = {
  name: string
  artUrl?: string
  found: number
  total: number
  parts: StructureRowPart[]
  open: boolean
  onToggle: () => void
  labels: { progress: string; built: string; unknownPart: string; toggle: string }
}

// One started structure: its art, name and "n of m" (or "built"). The parts show only while the row is
// open; a part not yet found reads as the unknown label.
export const StructureRow: FC<StructureRowProps> = ({ name, artUrl, found, total, parts, open, onToggle, labels }) => {
  // A closed row still tells there is news inside.
  const newLabel = parts.find(part => part.newLabel)?.newLabel
  return (
    <li className="rounded-lg border border-amber-900/30 bg-amber-50/60 shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-label={newLabel ? `${name}, ${newLabel}, ${labels.toggle}` : `${name}, ${labels.toggle}`}
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-2 text-left"
      >
        <span className="flex size-12 shrink-0 items-center justify-center">
          {artUrl && <img src={artUrl} alt="" className="max-h-full max-w-full object-contain" />}
        </span>
        <span className="flex-1 font-semibold text-amber-950">{name}</span>
        {newLabel && <NewBadge label={newLabel} />}
        <span className="text-sm text-amber-900">{found >= total ? labels.built : labels.progress}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1 px-3 pb-3">
          {parts.map(part => (
            <li
              key={part.id}
              className={`flex items-center gap-2 rounded-md text-sm text-amber-950 ${part.newLabel ? "border-2 border-camp-accent px-1" : ""}`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {part.name !== undefined && part.iconUrl && (
                  <img src={part.iconUrl} alt="" className="max-h-full max-w-full object-contain" />
                )}
              </span>
              <span className={part.name === undefined ? "text-amber-900/60" : undefined}>
                {part.name ?? labels.unknownPart}
              </span>
              {part.newLabel && <NewBadge label={part.newLabel} />}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
