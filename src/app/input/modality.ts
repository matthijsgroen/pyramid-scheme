export type Modality = "touch" | "keys" | "pad"

/** Marks `<html>` with the input last used, so focus rings and cursors can show for keys and pad only. */
export const setModality = (modality: Modality, root: HTMLElement = document.documentElement) => {
  if (root.dataset.input !== modality) root.dataset.input = modality
}

/** A pointer makes it touch, a key makes it keys. The pad sets its own when it polls a press. */
export const listenForModality = (target: Window = window) => {
  const pointer = () => setModality("touch")
  const key = () => setModality("keys")
  // Capture, so a handler that stops the event still leaves the modality right.
  target.addEventListener("pointerdown", pointer, true)
  target.addEventListener("keydown", key, true)
  return () => {
    target.removeEventListener("pointerdown", pointer, true)
    target.removeEventListener("keydown", key, true)
  }
}
