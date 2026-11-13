import type { InputSignal } from "@/app/input/actions"
import type { GridCell } from "@/app/input/useGridCursor"

/** The pad key `prev`/`next` have picked for a pad's confirm: a value, or the eraser. */
export type PadPick = number | "erase"

type Pad = {
  size: number
  picked?: PadPick
  /** Values with nothing left to place, which the pad dims: `prev`/`next` pass over them. */
  exhausted?: ReadonlySet<number>
  onPick: (pick: PadPick) => void
  /** The pad's value key, pressed for the square at `at`. */
  onValue: (value: number, at: GridCell) => void
  onErase: (at: GridCell) => void
  onTogglePencil: () => void
}

const step = ({ size, picked, exhausted }: Pad, by: 1 | -1): PadPick => {
  const keys: PadPick[] = [...Array.from({ length: size }, (_unused, index) => index + 1), "erase"]
  const open = (key: PadPick) => key === "erase" || !exhausted?.has(key)
  let at = picked === undefined ? (by > 0 ? -1 : keys.length - 1) : keys.indexOf(picked)
  do at = (at + by + keys.length) % keys.length
  while (!open(keys[at]))
  return keys[at]
}

/**
 * The keys of a value pad, for the square under the cursor: a digit is that value's key, erase the eraser,
 * alt the pencil. `prev`/`next` walk a pick along the pad (1…size, then the eraser) and confirm presses it, so a
 * game pad without digits places values too. With nothing picked, confirm is left to the board's own tap.
 */
export const padKeys =
  (pad: Pad) =>
  ({ action, repeat, released }: InputSignal, at: GridCell): boolean => {
    if (released) return false
    switch (action.kind) {
      case "value":
        if (action.value > pad.size) return false
        if (!repeat) pad.onValue(action.value, at)
        return true
      case "erase":
        if (!repeat) pad.onErase(at)
        return true
      case "alt":
        if (!repeat) pad.onTogglePencil()
        return true
      case "prev":
      case "next":
        pad.onPick(step(pad, action.kind === "next" ? 1 : -1))
        return true
      case "confirm":
        if (pad.picked === undefined) return false
        if (!repeat) {
          if (pad.picked === "erase") pad.onErase(at)
          else pad.onValue(pad.picked, at)
        }
        return true
      default:
        return false
    }
  }
