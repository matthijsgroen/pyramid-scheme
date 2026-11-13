import type { InputAction, InputSignal } from "./actions"
import { keyAction, keyFallback } from "./keyMap"

// A field being typed into keeps every key, Escape and the arrows included. A checkbox types nothing.
const EDITABLE = 'input:not([type="checkbox"]), textarea, select, [contenteditable=""], [contenteditable="true"]'
const isEditable = (target: EventTarget | null) => target instanceof Element && !!target.closest(EDITABLE)

// Enter and Space on a focused button (Space on a checkbox) already press it; a second press from here would be a double tap.
const pressesItself = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('button, a[href], [role="button"], input[type="checkbox"]')

type Options = {
  /** Whether the focused element lies within the top layer. A key pressed on one beneath it is taken from it. */
  onTop?: (target: EventTarget | null) => boolean
  target?: Window
}

/**
 * Turns the keyboard into input signals for `deliver`.
 *
 * Focus within the top layer: the focused element's own key handling goes first, and a key it or the browser
 * already handled is left alone, as is a key `deliver` does not use. Focus on something beneath the top layer
 * (a board still focused under a conversation): the key is the top layer's before that element sees it.
 *
 * Every key still held is let go when the window loses focus, because its keyup will never arrive.
 */
export const listenToKeyboard = (
  deliver: (signal: InputSignal) => boolean,
  { onTop = () => true, target = window }: Options = {}
) => {
  const held = new Map<string, InputAction>()
  const signal = (action: InputAction, event: KeyboardEvent): InputSignal => ({
    action,
    source: "keys",
    repeat: event.repeat,
    released: false,
    target: event.target,
  })
  const release = (code: string, action: InputAction, eventTarget: EventTarget | null) => {
    held.delete(code)
    deliver({ action, source: "keys", repeat: false, released: true, target: eventTarget })
  }

  const actionOf = (event: KeyboardEvent) => {
    const action = keyAction(event)
    return !action || event.defaultPrevented || isEditable(event.target) ? undefined : action
  }

  // Delivers `action`, or the key's fallback when nothing used it, and holds whichever was used.
  const send = (action: InputAction, event: KeyboardEvent) => {
    held.set(event.code, action)
    if (deliver(signal(action, event))) return true
    const fallback = keyFallback(event)
    if (!fallback) return false
    held.set(event.code, fallback)
    return deliver(signal(fallback, event))
  }

  const beneath = (event: KeyboardEvent) => {
    const action = actionOf(event)
    if (!action || onTop(event.target)) return
    event.stopPropagation()
    event.preventDefault()
    send(action, event)
  }
  const down = (event: KeyboardEvent) => {
    const action = actionOf(event)
    if (!action) return
    if (action.kind === "confirm" && pressesItself(event.target)) return
    if (send(action, event)) event.preventDefault()
  }
  const up = (event: KeyboardEvent) => {
    const action = held.get(event.code)
    if (action) release(event.code, action, event.target)
  }
  const blur = () => {
    for (const [code, action] of [...held]) release(code, action, null)
  }

  target.addEventListener("keydown", beneath, true)
  target.addEventListener("keydown", down)
  target.addEventListener("keyup", up)
  target.addEventListener("blur", blur)
  return () => {
    target.removeEventListener("keydown", beneath, true)
    target.removeEventListener("keydown", down)
    target.removeEventListener("keyup", up)
    target.removeEventListener("blur", blur)
  }
}
