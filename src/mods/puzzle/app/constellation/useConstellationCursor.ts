import { useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { InputHandler } from "@/app/input/actions"
import { nearestInDirection, type Rect } from "@/app/input/spatialNavigation"
import { colOf, pairTowards, rowOf, type ConstellationPuzzle } from "@/mods/puzzle/game/constellation/constellation"

type Options = {
  puzzle: ConstellationPuzzle
  /** The drag's own report: a line cycled on one pair. */
  onDrawLine: (pair: number) => void
}

/** A direction as the `[deltaRow, deltaCol]` a drag resolves to. */
export const DELTA: Record<Direction, [number, number]> = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] }

/**
 * Keys and pad on the stars. A direction moves the cursor to the nearest star that way. While alt is held
 * (N or Shift, pad Y), a direction instead cycles the line leaving the cursor's star that way, through
 * `pairTowards` and `onDrawLine` as a drag in that direction does; a held direction does not cycle again.
 */
export const useConstellationCursor = ({ puzzle, onDrawLine }: Options) => {
  const [cursor, setCursor] = useState(0)
  const [alt, setAlt] = useState(false)

  const rect = (star: number): Rect => {
    const cell = puzzle.stars[star].cell
    return { left: colOf(puzzle.size, cell), top: rowOf(puzzle.size, cell), width: 1, height: 1 }
  }

  const handle: InputHandler = ({ action, repeat, released, target }) => {
    if (action.kind === "alt") {
      setAlt(!released)
      return !released
    }
    if (released) return false
    if (action.kind === "move") {
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      if (alt) {
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
    return false
  }

  return { cursor, alt, point: setCursor, handle }
}
