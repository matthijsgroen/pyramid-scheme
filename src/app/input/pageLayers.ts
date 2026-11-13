import { INPUT_LAYER_CLOSED, INPUT_LAYER_OPENED } from "@/ui/atoms/dialogFocus"
import { domLayerHandler } from "./domLayer"
import { openLayer } from "./layerStack"

/**
 * Opens an input layer for every piece of the page that announces itself (`layerOnMount`, `focusOnMount` in
 * src/ui), and closes it when that piece leaves. The design system only announces, so it holds no input state.
 */
export const listenForPageLayers = (doc: Document = document) => {
  const open = new Map<HTMLElement, () => void>()
  const opened = (event: Event) => {
    const el = (event as CustomEvent<HTMLElement>).detail
    if (!(el instanceof HTMLElement) || open.has(el)) return
    open.set(el, openLayer(domLayerHandler(el), el))
  }
  const closed = (event: Event) => {
    const el = (event as CustomEvent<HTMLElement>).detail
    open.get(el)?.()
    open.delete(el)
  }
  doc.addEventListener(INPUT_LAYER_OPENED, opened)
  doc.addEventListener(INPUT_LAYER_CLOSED, closed)
  return () => {
    doc.removeEventListener(INPUT_LAYER_OPENED, opened)
    doc.removeEventListener(INPUT_LAYER_CLOSED, closed)
    for (const close of open.values()) close()
    open.clear()
  }
}
