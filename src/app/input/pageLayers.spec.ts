// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { focusOnMount, layerOnMount } from "@/ui/atoms/dialogFocus"
import { openLayer } from "./layerStack"
import { listenForPageLayers } from "./pageLayers"

let stop = () => {}
beforeEach(() => {
  stop = listenForPageLayers()
})
afterEach(() => {
  stop()
  document.body.innerHTML = ""
})

const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", cancelable: true }))

const withWayBack = () => {
  const el = document.body.appendChild(document.createElement("div"))
  const back = el.appendChild(document.createElement("button"))
  back.setAttribute("data-input-back", "")
  const onBack = vi.fn()
  back.addEventListener("click", onBack)
  return { el, onBack }
}

describe("a piece of the page as an input layer", () => {
  it("is the top layer from the moment it mounts until it unmounts", () => {
    const map = vi.fn(() => true)
    const closeMap = openLayer(map)
    const { el, onBack } = withWayBack()

    const unmount = layerOnMount(el)
    escape()
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(map).not.toHaveBeenCalled()

    unmount?.()
    escape()
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenCalledTimes(1)
    closeMap()
  })

  it("is a dialog's too, which also takes focus", () => {
    const { el, onBack } = withWayBack()
    el.tabIndex = -1
    const unmount = focusOnMount(el)
    expect(document.activeElement).toBe(el)
    escape()
    expect(onBack).toHaveBeenCalledTimes(1)
    unmount?.()
  })

  it("is closed with the rest when nobody listens any more", () => {
    const { el, onBack } = withWayBack()
    layerOnMount(el)
    stop()
    escape()
    expect(onBack).not.toHaveBeenCalled()
  })
})
