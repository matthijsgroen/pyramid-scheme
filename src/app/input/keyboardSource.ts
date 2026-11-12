import type { InputAction, InputSignal } from "./actions"
import { keyAction } from "./keyMap"

// A field being typed into keeps every key, Escape and the arrows included.
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const isEditable = (target: EventTarget | null) => target instanceof Element && !!target.closest(EDITABLE)

// Enter and Space on a focused button already press that button; a second press from here would be a double tap.
const pressesItself = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('button, a[href], [role="button"]')

/**
 * Turns the keyboard into input signals for `deliver`. A key the browser or a field already handled is left
 * alone, and so is a key `deliver` does not use: only a used key is kept from the browser. Every key still held
 * is let go when the window loses focus, because its keyup will never arrive.
 */
export const listenToKeyboard = (deliver: (signal: InputSignal) => boolean, target: Window = window) => {
  const held = new Map<string, InputAction>()
  const release = (code: string, action: InputAction, eventTarget: EventTarget | null) => {
    held.delete(code)
    deliver({ action, source: "keys", repeat: false, released: true, target: eventTarget })
  }

  const down = (event: KeyboardEvent) => {
    const action = keyAction(event)
    if (!action || event.defaultPrevented || isEditable(event.target)) return
    if (action.kind === "confirm" && pressesItself(event.target)) return
    held.set(event.code, action)
    const used = deliver({ action, source: "keys", repeat: event.repeat, released: false, target: event.target })
    if (used) event.preventDefault()
  }
  const up = (event: KeyboardEvent) => {
    const action = held.get(event.code)
    if (action) release(event.code, action, event.target)
  }
  const blur = () => {
    for (const [code, action] of [...held]) release(code, action, null)
  }

  target.addEventListener("keydown", down)
  target.addEventListener("keyup", up)
  target.addEventListener("blur", blur)
  return () => {
    target.removeEventListener("keydown", down)
    target.removeEventListener("keyup", up)
    target.removeEventListener("blur", blur)
  }
}
