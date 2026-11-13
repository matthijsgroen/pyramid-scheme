import { useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { InputHandler } from "@/app/input/actions"
import { nearestInDirection, type Rect } from "@/app/input/spatialNavigation"
import { colOf, pairTowards, rowOf, type ConstellationPuzzle } from "@/mods/puzzle/game/constellation/constellation"

type Options = {
  puzzle: ConstellationPuzzle
  /** The drag's own report: a line cycled on one pair. */
  onDrawLine: (pair: number) => void
  /** The board is solved: a star held by keys is let go, and none can be picked up. */
  done?: boolean
}

/** A direction as the `[deltaRow, deltaCol]` a drag resolves to. */
export const DELTA: Record<Direction, [number, number]> = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] }

/**
 * Keys and pad on the stars. A direction moves the cursor to the nearest star that way. Confirm picks the
 * cursor's star up; while it is held, or while alt is held down (N or Shift, pad Y), a direction instead
 * cycles the line leaving that star that way, through `pairTowards` and `onDrawLine` as a drag in that
 * direction does, and a held direction does not cycle again. Confirm or back lets the star go, and so do a
 * pointer on a star and a solved board.
 */
export const useConstellationCursor = ({ puzzle, onDrawLine, done = false }: Options) => {
  const [cursor, setCursor] = useState(0)
  const [alt, setAlt] = useState(false)
  const [picked, setPicked] = useState(false)
  const held = picked && !done

  const rect = (star: number): Rect => {
    const cell = puzzle.stars[star].cell
    return { left: colOf(puzzle.size, cell), top: rowOf(puzzle.size, cell), width: 1, height: 1 }
  }

  /** A pointer took a star: the cursor goes with it, and a star held by keys is let go. */
  const point = (star: number) => {
    setPicked(false)
    setCursor(star)
  }

  const handle: InputHandler = ({ action, repeat, released, target }) => {
    if (action.kind === "alt") {
      setAlt(!released)
      return !released
    }
    if (released) return false
    if (action.kind === "move") {
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      if (held || alt) {
        const pair = repeat ? undefined : pairTowards(puzzle, cursor, ...DELTA[action.dir])
        if (pair !== undefined) onDrawLine(pair)
        return true
      }
      const next = nearestInDirection(
        rect(cursor),
        puzzle.stars.map((_, star) => rect(star)),
        action.dir
      )
      if (next !== undefined) setCursor(next)
      return true
    }
    if (action.kind === "confirm") {
      if (!repeat && !done) setPicked(!held)
      return true
    }
    if (action.kind === "back" && held) {
      if (!repeat) setPicked(false)
      return true
    }
    return false
  }

  return { cursor, alt, held, point, handle }
}
