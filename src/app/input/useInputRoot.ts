import { useEffect } from "react"
import { listenToGamepads } from "./gamepadSource"
import { dispatchInput } from "./layerStack"
import { listenForModality, setModality, setPadBrand } from "./modality"
import { padBrandOf } from "./padBrand"
import { listenForPageLayers } from "./pageLayers"

/**
 * Mounted once at the root: dialogs and other page layers join the input stack, a game pad feeds the same
 * layers as the keyboard, and `<html>` tracks the modality and the brand of the pad last pressed.
 */
export const useInputRoot = () => {
  useEffect(() => {
    const stopLayers = listenForPageLayers()
    const stopModality = listenForModality()
    const stopPads = listenToGamepads((signal, padId) => {
      if (!signal.released) {
        setModality("pad")
        if (padId !== undefined) setPadBrand(padBrandOf(padId))
      }
      dispatchInput(signal)
    })
    return () => {
      stopLayers()
      stopModality()
      stopPads()
    }
  }, [])
}
