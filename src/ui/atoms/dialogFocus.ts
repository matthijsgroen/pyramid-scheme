import type { KeyboardEvent } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// A stable ref callback for a dialog (give it tabIndex -1): focus moves in once, when it mounts, so the keys
// reach it, and returns to whatever opened it when it unmounts.
export const focusOnMount = (el: HTMLElement | null) => {
  if (!el) return
  const opener = document.activeElement
  el.focus()
  return () => {
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  }
}

// Escape closes only the dialog it was pressed in: one nested inside (a confirmation) closes itself first.
export const closeOnEscape = (close: () => void) => (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Escape") return
  if ((event.target as Element).closest('[role="dialog"]') !== event.currentTarget) return
  close()
}

// Tab walks the dialog's own controls and wraps, so focus never lands on the page behind it.
export const trapTab = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Tab") return
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (controls.length === 0) {
    event.preventDefault()
    return
  }
  const first = controls[0]
  const last = controls[controls.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === event.currentTarget)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
