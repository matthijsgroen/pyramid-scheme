import { useEffect, useEffectEvent, type RefObject } from "react"
import type { InputHandler } from "./actions"
import { openLayer } from "./layerStack"

/**
 * Opens an input layer while the component is mounted (and `open`): it is on top of whatever was open before,
 * and gets every action until it closes or another layer opens over it. The handler is always the latest one.
 * With a `scope`, the layer is that element: a key pressed while focus is on something outside it (beneath it)
 * still comes here, and never reaches that element. Without one, the layer is the whole page.
 */
export const useInputLayer = (handler: InputHandler, open = true, scope?: RefObject<Element | null>) => {
  const handle = useEffectEvent(handler)
  useEffect(() => {
    if (!open) return
    return openLayer(signal => handle(signal), scope?.current ?? undefined)
  }, [open, scope])
}
