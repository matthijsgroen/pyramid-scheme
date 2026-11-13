import { useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { InputHandler } from "./actions"

export type GridCell = { row: number; col: number }

type Options = {
  rows: number
  cols: number
  /** Where the cursor starts: the first open cell, where a board has cells that are not. Read once. */
  start?: () => GridCell
  /** The board's tap on a cell. `confirm` and a tap both reach it, so a key does exactly what a tap does. */
  onConfirm: (row: number, col: number) => void
  /** A board's second action on a cell (notes, exclude), for families that have one. */
  onAlt?: (row: number, col: number) => void
}

const STEP: Record<Direction, GridCell> = {
  n: { row: -1, col: 0 },
  e: { row: 0, col: 1 },
  s: { row: 1, col: 0 },
  w: { row: 0, col: -1 },
}

const clamp = (value: number, size: number) => Math.max(0, Math.min(size - 1, value))

/**
 * A cursor on a rows×cols board for keys and pad. A direction moves it one cell and stops at the edge; confirm
 * and alt act on the cell under it. `tap` is what a pointer calls: it puts the cursor where the finger was and
 * makes the same tap, so a player switching to keys carries on from there.
 */
export const useGridCursor = ({ rows, cols, start, onConfirm, onAlt }: Options) => {
  const [cursor, setCursor] = useState<GridCell>(() => start?.() ?? { row: 0, col: 0 })
  const row = clamp(cursor.row, rows)
  const col = clamp(cursor.col, cols)

  const tap = (at: number, of: number) => {
    setCursor({ row: at, col: of })
    onConfirm(at, of)
  }

  const handle: InputHandler = ({ action, repeat, released, target }) => {
    if (released) return false
    if (action.kind === "move") {
      // The cursor takes over from a focused button: Enter on it would press that button, not the cell.
      if (target instanceof HTMLElement && target !== document.body) target.blur()
      const step = STEP[action.dir]
      setCursor(now => ({
        row: clamp(clamp(now.row, rows) + step.row, rows),
        col: clamp(clamp(now.col, cols) + step.col, cols),
      }))
      return true
    }
    if (action.kind === "confirm") {
      if (!repeat) onConfirm(row, col)
      return true
    }
    if (action.kind === "alt" && onAlt) {
      if (!repeat) onAlt(row, col)
      return true
    }
    return false
  }

  return { row, col, at: (r: number, c: number) => r === row && c === col, tap, handle }
}
