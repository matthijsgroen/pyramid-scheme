import { FOCUSABLE } from "@/ui/atoms/dialogFocus"
import type { InputHandler } from "./actions"
import { nearestInDirection } from "./spatialNavigation"

const usable = (el: HTMLElement) =>
  !el.closest("[inert]") && el.checkVisibility?.({ visibilityProperty: true }) !== false

const controlsIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(usable)

const press = (root: HTMLElement, selector: string) => {
  const control = [...root.querySelectorAll<HTMLElement>(`${selector}:not(:disabled)`)].find(usable)
  control?.click()
  return !!control
}

/**
 * A layer that is a piece of the page (a dialog, the encounter frame, the camp): `move` focuses the nearest
 * control in that direction within it, `confirm` clicks the focused control, `back` clicks its visible way back
 * (the control marked `data-input-back`) and `menu` its settings (`data-input-menu`). Without one, they do
 * nothing.
 */
export const domLayerHandler =
  (root: HTMLElement): InputHandler =>
  ({ action, released, repeat }) => {
    // A held Escape or Enter acts once: its repeat must not go on to the layer beneath.
    if (released || (repeat && action.kind !== "move")) return false
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusedHere = focused && focused !== root && root.contains(focused) ? focused : null

    if (action.kind === "move") {
      const controls = controlsIn(root)
      if (controls.length === 0) return false
      const from = focusedHere && controls.indexOf(focusedHere)
      if (from === null || from === -1) {
        controls[0].focus()
        return true
      }
      const rects = controls.map(el => el.getBoundingClientRect())
      const next = nearestInDirection(rects[from], rects, action.dir)
      if (next !== undefined) controls[next].focus()
      return true
    }
    if (action.kind === "confirm") {
      if (!focusedHere) return false
      focusedHere.click()
      return true
    }
    if (action.kind === "back") return press(root, "[data-input-back]")
    if (action.kind === "menu") return press(root, "[data-input-menu]")
    return false
  }
