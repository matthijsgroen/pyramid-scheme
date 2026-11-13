import { useRef, useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { InputHandler } from "@/app/input/actions"
import { hexFromKey, hexKey, type Hex } from "@/mods/puzzle/game/hidato/hex"

/**
 * Which neighbour each direction reaches on the pointy-top comb (keyboard-controller-plan.md, V11). Left and
 * right are the cells beside; up and down are the upper-left and lower-left cells, and `right` (held alt, or
 * E and X) bends them to the upper-right and lower-right.
 */
export const NEIGHBOUR_KEYS: readonly { dir: Direction; right: boolean; step: Hex }[] = [
  { dir: "n", right: false, step: { q: 0, r: -1 } },
  { dir: "n", right: true, step: { q: 1, r: -1 } },
  { dir: "e", right: false, step: { q: 1, r: 0 } },
  { dir: "s", right: true, step: { q: 0, r: 1 } },
  { dir: "s", right: false, step: { q: -1, r: 1 } },
  { dir: "w", right: false, step: { q: -1, r: 0 } },
]

/** The cell a direction reaches from `key`, bent right where it is up or down. */
export const neighbourOf = (key: string, dir: Direction, right: boolean): string => {
  const bent = right && (dir === "n" || dir === "s")
  const { step } = NEIGHBOUR_KEYS.find(entry => entry.dir === dir && entry.right === bent)!
  const { q, r } = hexFromKey(key)
  return hexKey({ q: q + step.q, r: r + step.r })
}

/**
 * The cell a direction moves to from `key` on this board: the neighbour it aims at, or for up and down the one on
 * the other side where that one is off the board. Undefined where neither is on it.
 */
export const reach = (cells: ReadonlySet<string>, key: string, dir: Direction, right: boolean): string | undefined => {
  const aimed = neighbourOf(key, dir, right)
  const next = cells.has(aimed) ? aimed : neighbourOf(key, dir, !right)
  return cells.has(next) ? next : undefined
}

type Options = {
  cells: ReadonlySet<string>
  /** Where the cursor starts. Read once. */
  start: string
  /** The cell the run is picked up at: while there is one, the cursor is on it. */
  pen?: string
  /** A tap on a cell: the press and the release a finger makes, in that order. */
  onPress: (key: string) => void
  /** The run dragged into a touching cell. */
  onDrag: (key: string) => void
  /** Puts the run down without changing a number. */
  onLift: () => void
}

/**
 * Keys and pad on the comb. Up or down reaches the neighbour on the other side where the one it aims at is not on
 * the board. Without a run picked up, a direction moves the cursor to that neighbour. With one,
 * the cursor is the run's head and a direction drags the run into that neighbour, so it moves only as far as the
 * run does. Confirm taps the cell under the cursor; back puts a picked-up run down before it leaves the board.
 */
export const useHidatoCursor = ({ cells, start, pen, onPress, onDrag, onLift }: Options) => {
  const [free, setFree] = useState(start)
  // Where the run was put down is where the cursor carries on from, however it was put down (undo, a tap).
  const [lastPen, setLastPen] = useState(pen)
  if (pen !== lastPen) {
    setLastPen(pen)
    if (pen !== undefined) setFree(pen)
  }
  const alt = useRef(false)
  const at = pen ?? free

  const go = (dir: Direction, right: boolean) => {
    const next = reach(cells, at, dir, right)
    if (next === undefined) return
    if (pen === undefined) setFree(next)
    else onDrag(next)
  }

  const handle: InputHandler = ({ action, repeat, released, target }) => {
    if (action.kind === "alt") {
      alt.current = !released
      return true
    }
    if (released) return false
    if (action.kind === "move" || action.kind === "veer") {
      // The cursor takes over from a focused button: Enter on it would press that button, not the cell.
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      go(action.dir, action.kind === "veer" || alt.current)
      return true
    }
    if (action.kind === "confirm") {
      if (!repeat) onPress(at)
      return true
    }
    if (action.kind === "back" && pen !== undefined) {
      if (!repeat) onLift()
      return true
    }
    return false
  }

  return { at, held: pen !== undefined, point: setFree, handle }
}
