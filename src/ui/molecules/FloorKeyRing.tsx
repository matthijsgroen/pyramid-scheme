import type { FC } from "react"
import type { KeyColor } from "@/game/siteTypes"
import { KeyIcon } from "@/ui/atoms/KeyIcon"

type FloorKeyRingProps = {
  /** Colours the player carries on this floor — drawn solid. */
  held: readonly KeyColor[]
  /** Colours of doors seen on this floor and still shut — drawn hollow. */
  needed?: readonly KeyColor[]
  /** Accessible name per colour, e.g. "Blue key (held)". */
  heldLabel: (color: KeyColor) => string
  neededLabel: (color: KeyColor) => string
  /** Shown when the ring holds nothing at all — omit to render nothing instead. */
  emptyLabel?: string
}

// The floor's key ring, as a HUD readout: which coloured keys are in hand, and which coloured doors
// are still waiting. Keys are floor-local, so this whole readout resets when the player changes
// floor — that is the point of it being here rather than in the collection.
export const FloorKeyRing: FC<FloorKeyRingProps> = ({ held, needed = [], heldLabel, neededLabel, emptyLabel }) => {
  if (held.length === 0 && needed.length === 0) {
    return emptyLabel ? <span className="text-xs text-stone-500">{emptyLabel}</span> : null
  }
  return (
    <div className="flex items-center gap-1 rounded border border-amber-900/60 bg-stone-900/70 px-2 py-1">
      {held.map(color => (
        <KeyIcon key={`held-${color}`} color={color} title={heldLabel(color)} />
      ))}
      {held.length > 0 && needed.length > 0 && <span className="mx-0.5 h-4 w-px bg-amber-900/60" />}
      {needed.map(color => (
        <KeyIcon key={`needed-${color}`} color={color} outlined title={neededLabel(color)} />
      ))}
    </div>
  )
}
