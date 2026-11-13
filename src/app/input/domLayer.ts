import { FOCUSABLE } from "@/ui/atoms/dialogFocus"
import type { InputHandler } from "./actions"
import { nearestInDirection } from "./spatialNavigation"

const usable = (el: HTMLElement) =>
  !el.closest("[inert]") && el.checkVisibility?.({ visibilityProperty: true }) !== false

// A control taken out of the tab order (the tabs a row does not have selected) is out of the arrows' too.
const controlsIn = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.tabIndex >= 0 && usable(el))

const press = (root: HTMLElement, selector: string) => {
  const control = [...root.querySelectorAll<HTMLElement>(`${selector}:not(:disabled)`)].find(usable)
  control?.click()
  return !!control
}

// Selects the tab beside the selected one in the layer's first tab row, wrapping; focus on that row follows it.
const turnTab = (root: HTMLElement, step: 1 | -1) => {
  const row = [...root.querySelectorAll<HTMLElement>('[role="tablist"]')].find(usable)
  const tabs = row ? [...row.querySelectorAll<HTMLElement>('[role="tab"]')] : []
  if (!row || tabs.length === 0) return false
  const at = tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true")
  const next = tabs[(at + step + tabs.length) % tabs.length]
  const focusFollows = row.contains(document.activeElement)
  next.click()
  if (focusFollows) next.focus()
  return true
}

/**
 * A layer that is a piece of the page (a dialog, the encounter frame, the camp): `move` focuses the nearest
 * control in that direction within it, `confirm` clicks the focused control, `back` clicks its visible way back
 * (the control marked `data-input-back`), `menu` its settings (`data-input-menu`) and `prev`/`next` turn its
 * tabs. Without one, they do nothing.
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
    if (action.kind === "prev" || action.kind === "next") return turnTab(root, action.kind === "next" ? 1 : -1)
    if (action.kind === "back") return press(root, "[data-input-back]")
    if (action.kind === "menu") return press(root, "[data-input-menu]")
    return false
  }
