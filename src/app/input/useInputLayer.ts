import { useEffect, useEffectEvent } from "react"
import type { InputHandler } from "./actions"
import { openLayer } from "./layerStack"

/**
 * Opens an input layer while the component is mounted (and `open`): it is on top of whatever was open before,
 * and gets every action until it closes or another layer opens over it. The handler is always the latest one.
 */
export const useInputLayer = (handler: InputHandler, open = true) => {
  const handle = useEffectEvent(handler)
  useEffect(() => {
    if (!open) return
    return openLayer(signal => handle(signal))
  }, [open])
}
