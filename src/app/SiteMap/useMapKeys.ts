import { useEffect, useEffectEvent, useRef } from "react"
import type { Direction } from "@/game/siteTypes"
import { useInputLayer } from "@/app/input/useInputLayer"

// A key pressed inside a dialog belongs to that dialog, even one that is not an input layer of its own.
const inDialog = (target: EventTarget | null) => target instanceof Element && !!target.closest('[role="dialog"]')

type Options = {
  /** Off while anything is open over the map: only the top layer gets keys. */
  active: boolean
  /** The tap each direction's ring arrow makes; empty while the explorer walks. */
  arrows: ReadonlyMap<Direction, readonly [number, number]>
  onMove: (row: number, col: number) => void
  onConfirm?: () => void
  onBack?: () => void
}

/**
 * The map's input layer: a direction presses the ring arrow pointing that way, confirm takes the prompt, back
 * asks to leave. A held direction walks on to the next stop once the explorer arrives (`arrows` fills again),
 * never while he walks; a held key's repeat is ignored.
 */
export const useMapKeys = ({ active, arrows, onMove, onConfirm, onBack }: Options) => {
  const held = useRef<Direction | null>(null)

  useInputLayer(({ action, repeat, released, target }) => {
    if (released) {
      if (action.kind === "move" && action.dir === held.current) held.current = null
      return false
    }
    if (!active || inDialog(target)) return false
    if (action.kind === "move") {
      held.current = action.dir
      if (repeat) return true
      const tap = arrows.get(action.dir)
      if (tap) onMove(tap[0], tap[1])
      return true
    }
    if (action.kind === "confirm") {
      if (!onConfirm) return false
      if (!repeat) onConfirm()
      return true
    }
    if (action.kind === "back") {
      if (!onBack) return false
      if (!repeat) onBack()
      return true
    }
    return false
  })
  const walkOn = useEffectEvent((tap: readonly [number, number]) => onMove(tap[0], tap[1]))

  // Arrival: the arrows around him are back, and a direction still held walks on.
  useEffect(() => {
    if (!active) {
      held.current = null
      return
    }
    const tap = held.current && arrows.get(held.current)
    if (tap) walkOn(tap)
  }, [arrows, active])
}
