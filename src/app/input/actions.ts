import type { Direction } from "@/game/siteTypes"

/** What a player means, whichever key or pad button said it. Consumers see these, never keys. */
export type InputAction =
  | { kind: "move"; dir: Direction }
  /** Up or down bent to the right: the upper-right or lower-right cell, on a board whose cells have six neighbours. */
  | { kind: "veer"; dir: "n" | "s" }
  | { kind: "confirm" }
  | { kind: "back" }
  | { kind: "undo" }
  | { kind: "alt" }
  | { kind: "erase" }
  | { kind: "prev" }
  | { kind: "next" }
  | { kind: "hint" }
  | { kind: "menu" }
  | { kind: "value"; value: number }

/** Where an action came from: the keyboard, or a game pad feeding the same layers. */
export type InputSource = "keys" | "pad"

export type InputSignal = {
  action: InputAction
  source: InputSource
  /** Held down: the keyboard's own repeat, or a pad's counted polls. */
  repeat: boolean
  /** Let go. A layer that keeps something held (a direction) drops it here. */
  released: boolean
  /** The element the input arrived at. */
  target: EventTarget | null
}

/** A layer's handler. Returns true when it used the signal, so the source keeps it from the browser. */
export type InputHandler = (signal: InputSignal) => boolean
