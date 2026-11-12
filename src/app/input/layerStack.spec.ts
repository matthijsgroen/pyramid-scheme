// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import type { InputHandler, InputSignal } from "./actions"
import { dispatchInput, openLayer } from "./layerStack"

const closers: (() => void)[] = []
const open = (handler: InputHandler, element?: Element) => {
  const close = openLayer(handler, element)
  closers.push(close)
  return close
}
afterEach(() => {
  closers.splice(0).forEach(close => close())
})

const layer = () => vi.fn<InputHandler>(() => true)
const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", cancelable: true }))
const padConfirm: InputSignal = {
  action: { kind: "confirm" },
  source: "pad",
  repeat: false,
  released: false,
  target: null,
}

describe("the input layers", () => {
  it("give every action to the top layer and none to the one beneath", () => {
    const map = layer()
    const dialog = layer()
    open(map)
    open(dialog)
    escape()
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(map).not.toHaveBeenCalled()
  })

  it("give the actions back to the layer beneath once the top one closes", () => {
    const map = layer()
    open(map)
    const close = open(layer())
    close()
    escape()
    expect(map).toHaveBeenCalledTimes(1)
  })

  it("take a second source's signals the same way", () => {
    const map = layer()
    const dialog = layer()
    open(map)
    open(dialog)
    expect(dispatchInput(padConfirm)).toBe(true)
    expect(dialog.mock.calls).toEqual([[padConfirm]])
  })

  it("put a layer that holds an open one beneath it, so a parent attached after its child is not on top", () => {
    const outer = document.createElement("div")
    const inner = outer.appendChild(document.createElement("div"))
    const innerLayer = layer()
    const outerLayer = layer()
    open(innerLayer, inner)
    open(outerLayer, outer)
    escape()
    expect(innerLayer).toHaveBeenCalledTimes(1)
    expect(outerLayer).not.toHaveBeenCalled()
  })

  it("listen to no key once the last layer closes", () => {
    const handler = layer()
    open(handler)()
    escape()
    expect(handler).not.toHaveBeenCalled()
    expect(dispatchInput(padConfirm)).toBe(false)
  })
})
