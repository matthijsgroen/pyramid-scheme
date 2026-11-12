import type { KeyboardEvent } from "react"

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Announced on `document` with the element as detail; the app's input layers listen (src/app/input). */
export const INPUT_LAYER_OPENED = "inputlayer:opened"
export const INPUT_LAYER_CLOSED = "inputlayer:closed"

const announce = (type: string, el: HTMLElement) => {
  document.dispatchEvent(new CustomEvent(type, { detail: el }))
}

// A stable ref callback: the element is the top input layer while it is mounted, so it gets the keys and the
// pad. Its control marked `data-input-back` is what `back` (Escape) presses.
export const layerOnMount = (el: HTMLElement | null) => {
  if (!el) return
  announce(INPUT_LAYER_OPENED, el)
  return () => announce(INPUT_LAYER_CLOSED, el)
}

// A stable ref callback for a dialog (give it tabIndex -1): it becomes the top input layer, and focus moves in
// once, when it mounts, and returns to whatever opened it when it unmounts.
export const focusOnMount = (el: HTMLElement | null) => {
  if (!el) return
  const opener = document.activeElement
  const closeLayer = layerOnMount(el)
  el.focus()
  return () => {
    closeLayer?.()
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  }
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
