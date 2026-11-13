import { vi } from "vitest"
import { act } from "react"
import { FOCUSABLE } from "@/ui/atoms/dialogFocus"

/**
 * jsdom lays nothing out, so every control sits at 0,0 and no direction leads anywhere. This puts the page's
 * focusable controls side by side in document order, so ArrowRight walks them one by one. Restored by
 * `vi.restoreAllMocks()`.
 */
export const controlsInARow = () =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const at = [...document.querySelectorAll(FOCUSABLE)].indexOf(this)
    return {
      left: at * 20,
      top: 0,
      width: 10,
      height: 10,
      right: at * 20 + 10,
      bottom: 10,
      x: at * 20,
      y: 0,
    } as DOMRect
  })

/** A key pressed and let go, as the keyboard source hears it. */
export const press = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })
