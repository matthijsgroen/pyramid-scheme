import { useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { InputHandler } from "@/app/input/actions"
import { nearestInDirection, type Rect } from "@/app/input/spatialNavigation"
import type { RushHourPuzzle, RushHourState } from "@/mods/puzzle/game/rushHour/rushHour"

type Options = {
  puzzle: RushHourPuzzle
  state: RushHourState
  /** A piece taken in hand: the start of one move, however many cells it then travels. */
  onGrab: (index: number) => void
  /** The same shove a drag reports, one cell per press. */
  onSlide: (index: number, offset: number) => void
  /** The piece let go: the move it made is done. */
  onRelease: () => void
}

/** One cell along a piece's own lane for a direction, or 0 for a direction across it. */
const along = (horizontal: boolean, dir: Direction) =>
  horizontal ? (dir === "e" ? 1 : dir === "w" ? -1 : 0) : dir === "s" ? 1 : dir === "n" ? -1 : 0

/**
 * Keys and pad on the blockade. A direction moves the cursor to the nearest piece that way; confirm takes the
 * cursor's piece in hand, and while it is held a direction along its lane shoves it one cell through `onSlide`
 * (the drag's own path) and a direction across its lane does nothing. Confirm or back lets go. Undo lets go
 * and leaves the undo itself to the shell.
 */
export const useRushHourCursor = ({ puzzle, state, onGrab, onSlide, onRelease }: Options) => {
  const [cursor, setCursor] = useState(0)
  const [held, setHeld] = useState(false)

  const rect = (index: number): Rect => {
    const piece = puzzle.pieces[index]
    const offset = state.offsets[index]
    return piece.horizontal
      ? { left: offset, top: piece.lane, width: piece.len, height: 1 }
      : { left: piece.lane, top: offset, width: 1, height: piece.len }
  }

  const release = () => {
    if (!held) return
    setHeld(false)
    onRelease()
  }

  /** A pointer took a piece: the cursor goes with it, and a piece held by keys is let go first. */
  const point = (index: number) => {
    release()
    setCursor(index)
  }

  const handle: InputHandler = ({ action, repeat, released, target }) => {
    if (released) return false
    if (held) {
      if (action.kind === "move") {
        const step = along(puzzle.pieces[cursor].horizontal, action.dir)
        if (step !== 0) onSlide(cursor, state.offsets[cursor] + step)
        return true
      }
      if (action.kind === "confirm" || action.kind === "back") {
        if (!repeat) release()
        return true
      }
      if (action.kind === "undo") release()
      return false
    }
    if (action.kind === "move") {
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      const next = nearestInDirection(
        rect(cursor),
        puzzle.pieces.map((_, index) => rect(index)),
        action.dir
      )
      if (next !== undefined) setCursor(next)
      return true
    }
    if (action.kind === "confirm") {
      if (!repeat) {
        setHeld(true)
        onGrab(cursor)
      }
      return true
    }
    return false
  }

  return { cursor, held, point, handle }
}
