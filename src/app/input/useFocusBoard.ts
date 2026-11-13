import { useEffect, useState } from "react"
import { FOCUSABLE } from "@/ui/atoms/dialogFocus"
import type { InputHandler } from "./actions"
import { domLayerHandler } from "./domLayer"
import { useInputLayer } from "./useInputLayer"

type Options = {
  /** The shell's `boardInput`, which takes back, undo and hint before the board sees a key. */
  wrap?: (board: InputHandler) => InputHandler
  /** Whether the layer is open. A board drawn on its own (a story of the bare board) leaves it shut. */
  open?: boolean
  /**
   * Focus the first control as the board opens, as a grid board starts its cursor on a cell. Left off where a
   * stray Enter must not pick anything, as on a timed choice.
   */
  focusFirst?: boolean
  /** The board's own keys (a digit for a value), tried before a direction or confirm reaches the controls. */
  onSignal?: InputHandler
}

/**
 * Keys and pad on a board made of buttons, with the focus as its cursor: a direction focuses the nearest of
 * the board's controls that way, and confirm clicks the focused one, the same click a tap makes. Returns the
 * ref for the board's element; `board-focus` on it draws the cursor on the focused control.
 */
export const useFocusBoard = <T extends HTMLElement>({ wrap, open = true, focusFirst = false, onSignal }: Options) => {
  const [root, setRoot] = useState<T | null>(null)
  const handler: InputHandler = signal =>
    (onSignal?.(signal) ?? false) || (root !== null && domLayerHandler(root)(signal))
  useInputLayer(wrap ? wrap(handler) : handler, open)

  // Once, as the board opens: a later render must not pull the focus back from where the player took it.
  useEffect(() => {
    if (open && focusFirst) root?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, open])

  return setRoot
}
