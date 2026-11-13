import { useEffect } from "react"
import { listenToGamepads } from "./gamepadSource"
import { dispatchInput } from "./layerStack"
import { listenForModality, setModality } from "./modality"
import { listenForPageLayers } from "./pageLayers"

/**
 * Mounted once at the root: dialogs and other page layers join the input stack, a game pad feeds the same
 * layers as the keyboard, and `<html>` tracks the modality.
 */
export const useInputRoot = () => {
  useEffect(() => {
    const stopLayers = listenForPageLayers()
    const stopModality = listenForModality()
    const stopPads = listenToGamepads(signal => {
      if (!signal.released) setModality("pad")
      dispatchInput(signal)
    })
    return () => {
      stopLayers()
      stopModality()
      stopPads()
    }
  }, [])
}
