import { useEffect } from "react"
import { listenForModality } from "./modality"
import { listenForPageLayers } from "./pageLayers"

/** Mounted once at the root: dialogs and other page layers join the input stack, and `<html>` tracks the modality. */
export const useInputRoot = () => {
  useEffect(() => {
    const stopLayers = listenForPageLayers()
    const stopModality = listenForModality()
    return () => {
      stopLayers()
      stopModality()
    }
  }, [])
}
