import { useState } from "react"
import type { InputHandler } from "@/app/input/actions"

type Options = {
  /** Where each row's bar starts now. */
  starts: readonly number[]
  /** Rows the player cannot move yet; the cursor passes them by. */
  locked?: readonly boolean[]
  /** How many marks stand under the board. */
  marks: number
  /** The mark picked, as a tap on it picks it. */
  focus?: number
  onFocus: (mark: number | undefined) => void
  /** The same slide a drag reports, one tick per press. */
  onSlide: (index: number, start: number) => void
}

/**
 * Keys and pad on the day. Up and down move the cursor between the rows the player may move; left and right
 * slide that row's bar one tick through `onSlide`, the drag's own path. Prev and next walk the marks under the
 * board, as a tap on one picks it, with nothing picked between the last and the first.
 */
export const useProcessionCursor = ({ starts, locked, marks, focus, onFocus, onSlide }: Options) => {
  const free = (row: number) => !(locked?.[row] ?? false)
  const [cursor, setCursor] = useState(() =>
    Math.max(
      0,
      starts.findIndex((_, row) => free(row))
    )
  )

  const handle: InputHandler = ({ action, released, target }) => {
    if (released) return false
    if (action.kind === "move") {
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      if (action.dir === "n" || action.dir === "s") {
        const step = action.dir === "s" ? 1 : -1
        for (let row = cursor + step; row >= 0 && row < starts.length; row += step)
          if (free(row)) {
            setCursor(row)
            break
          }
      } else if (free(cursor)) onSlide(cursor, starts[cursor] + (action.dir === "e" ? 1 : -1))
      return true
    }
    if (action.kind === "prev" || action.kind === "next") {
      // Picked marks and "none" in one ring: none sits at 0, mark m at m + 1.
      const ring = marks + 1
      const at = focus === undefined ? 0 : focus + 1
      const next = (at + (action.kind === "next" ? 1 : -1) + ring) % ring
      onFocus(next === 0 ? undefined : next - 1)
      return true
    }
    return false
  }

  return { cursor, point: setCursor, handle }
}
