import { useEffect, useEffectEvent, useRef } from "react"
import type { Direction } from "@/game/siteTypes"

export type MapKeyAction = { kind: "move"; dir: Direction } | { kind: "confirm" } | { kind: "back" }

// By physical position (`code`), so WASD is ZQSD on an AZERTY keyboard.
const ACTIONS: Record<string, MapKeyAction> = {
  ArrowUp: { kind: "move", dir: "n" },
  ArrowRight: { kind: "move", dir: "e" },
  ArrowDown: { kind: "move", dir: "s" },
  ArrowLeft: { kind: "move", dir: "w" },
  KeyW: { kind: "move", dir: "n" },
  KeyD: { kind: "move", dir: "e" },
  KeyS: { kind: "move", dir: "s" },
  KeyA: { kind: "move", dir: "w" },
  Enter: { kind: "confirm" },
  NumpadEnter: { kind: "confirm" },
  Space: { kind: "confirm" },
  Escape: { kind: "back" },
}

export const mapKeyAction = (code: string): MapKeyAction | undefined => ACTIONS[code]

// A key typed into a field, or pressed inside a dialog, belongs to that field or dialog.
const ownedElsewhere = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')

// Enter and Space on a focused button already press that button.
const pressesItself = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('button, a[href], [role="button"]')

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
 * The map's keys: a direction presses the ring arrow pointing that way, Enter or Space takes the prompt, Escape asks
 * to leave. A held direction walks on to the next stop once the explorer arrives (`arrows` fills again), never while
 * he walks; the keyboard's own repeat is ignored.
 */
export const useMapKeys = ({ active, arrows, onMove, onConfirm, onBack }: Options) => {
  const held = useRef<Direction | null>(null)

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const action = mapKeyAction(event.code)
    if (!action || !active || event.defaultPrevented) return
    if (event.ctrlKey || event.metaKey || event.altKey || ownedElsewhere(event.target)) return
    if (action.kind === "move") {
      event.preventDefault()
      held.current = action.dir
      if (event.repeat) return
      const tap = arrows.get(action.dir)
      if (tap) onMove(tap[0], tap[1])
    } else if (action.kind === "confirm") {
      if (!onConfirm || pressesItself(event.target)) return
      event.preventDefault()
      if (!event.repeat) onConfirm()
    } else if (onBack) {
      event.preventDefault()
      if (!event.repeat) onBack()
    }
  })
  const walkOn = useEffectEvent((tap: readonly [number, number]) => onMove(tap[0], tap[1]))

  useEffect(() => {
    const down = (event: KeyboardEvent) => onKeyDown(event)
    const up = (event: KeyboardEvent) => {
      const action = mapKeyAction(event.code)
      if (action?.kind === "move" && action.dir === held.current) held.current = null
    }
    const release = () => {
      held.current = null
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", release)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", release)
    }
  }, [])

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
