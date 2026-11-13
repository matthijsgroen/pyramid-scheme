import type { PadBrand } from "@/ui/atoms/glyphs"
import { padBrandOf } from "./padBrand"

export type Modality = "touch" | "keys" | "pad"

/** Marks `<html>` with the input last used, so focus rings and cursors can show for keys and pad only. */
export const setModality = (modality: Modality, root: HTMLElement = document.documentElement) => {
  if (root.dataset.input !== modality) root.dataset.input = modality
}

/** Marks `<html>` with the brand of the pad last used, so its buttons are drawn as they are printed. */
export const setPadBrand = (brand: PadBrand, root: HTMLElement = document.documentElement) => {
  if (root.dataset.pad !== brand) root.dataset.pad = brand
}

/**
 * A pointer makes it touch, a key makes it keys. The pad sets its own when it polls a press; a pad connecting
 * marks its brand.
 */
export const listenForModality = (target: Window = window) => {
  const pointer = () => setModality("touch")
  const key = () => setModality("keys")
  const connected = (event: Event) => {
    const id = (event as GamepadEvent).gamepad?.id
    if (id !== undefined) setPadBrand(padBrandOf(id))
  }
  // Capture, so a handler that stops the event still leaves the modality right.
  target.addEventListener("pointerdown", pointer, true)
  target.addEventListener("keydown", key, true)
  target.addEventListener("gamepadconnected", connected)
  return () => {
    target.removeEventListener("pointerdown", pointer, true)
    target.removeEventListener("keydown", key, true)
    target.removeEventListener("gamepadconnected", connected)
  }
}
