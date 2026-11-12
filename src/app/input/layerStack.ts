import type { InputHandler, InputSignal } from "./actions"
import { listenToKeyboard } from "./keyboardSource"

type Layer = { handler: InputHandler; element?: Element }

const layers: Layer[] = []
let stopKeyboard: (() => void) | undefined

/**
 * Hands a signal to the top layer and to no other. Returns whether that layer used it. The keyboard feeds this
 * itself; any other source (a game pad) calls it with its own signals.
 */
export const dispatchInput = (signal: InputSignal): boolean => {
  const top = layers.at(-1)
  return top ? top.handler(signal) : false
}

/**
 * Opens an input layer on top of the stack and returns the function that closes it. A layer with an `element`
 * that holds an already open layer's element goes in beneath that one: React attaches a child before its
 * parent, so a dialog opened inside another in the same render must still end up on top of it.
 */
export const openLayer = (handler: InputHandler, element?: Element): (() => void) => {
  const layer: Layer = { handler, element }
  const inside = element ? layers.findIndex(open => open.element && element.contains(open.element)) : -1
  if (inside === -1) layers.push(layer)
  else layers.splice(inside, 0, layer)
  stopKeyboard ??= listenToKeyboard(dispatchInput)

  return () => {
    const at = layers.indexOf(layer)
    if (at === -1) return
    layers.splice(at, 1)
    if (layers.length === 0) {
      stopKeyboard?.()
      stopKeyboard = undefined
    }
  }
}
