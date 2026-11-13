import type { Direction } from "@/game/siteTypes"
import { FOCUSABLE } from "@/ui/atoms/dialogFocus"
import type { InputHandler } from "./actions"
import { type Rect, nearestInDirection } from "./spatialNavigation"

const usable = (el: HTMLElement) =>
  !el.closest("[inert]") && el.checkVisibility?.({ visibilityProperty: true }) !== false

// A control taken out of the tab order (the tabs a row does not have selected) is out of the arrows' too.
const controlsIn = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.tabIndex >= 0 && usable(el))

const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

// Kept per layer, outside the handler: a new handler is made for every signal.
const lastMove = new WeakMap<HTMLElement, { from: HTMLElement; to: HTMLElement; dir: Direction }>()

/**
 * A tab out of the tab order leaves only the selected one to land on, which may sit far to one side. Measured
 * as a sliver at the point of its row nearest the move's line, the row counts as straight ahead wherever it
 * lies across from the control the move starts at.
 */
const measure = (el: HTMLElement, from: Rect, dir: Direction): Rect => {
  const rect = el.getBoundingClientRect()
  const row = el.getAttribute("role") === "tab" ? el.closest<HTMLElement>('[role="tablist"]') : null
  if (!row) return rect
  const span = row.getBoundingClientRect()
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)
  if (dir === "n" || dir === "s") {
    const left = clamp(from.left + from.width / 2, span.left, span.left + span.width)
    return { left, width: 0, top: rect.top, height: rect.height }
  }
  const top = clamp(from.top + from.height / 2, span.top, span.top + span.height)
  return { left: rect.left, width: rect.width, top, height: 0 }
}

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
 * control in that direction within it (the opposite direction straight after goes back where it came from),
 * `confirm` clicks the focused control, `back` clicks its visible way back
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
      const origin = controls[from]
      const last = lastMove.get(root)
      const back =
        last && last.to === origin && last.dir === OPPOSITE[action.dir] && controls.includes(last.from)
          ? last.from
          : undefined
      const start = origin.getBoundingClientRect()
      const rects = controls.map(el => (el === origin ? start : measure(el, start, action.dir)))
      const nearest = nearestInDirection(start, rects, action.dir)
      const next = back ?? (nearest === undefined ? undefined : controls[nearest])
      if (next) {
        next.focus()
        lastMove.set(root, { from: origin, to: next, dir: action.dir })
      }
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
