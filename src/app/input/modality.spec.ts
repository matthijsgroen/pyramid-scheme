// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { listenForModality, setModality } from "./modality"

let stop = () => {}
beforeEach(() => {
  delete document.documentElement.dataset.input
  stop = listenForModality()
})
afterEach(() => stop())

const mode = () => document.documentElement.dataset.input

describe("the input last used", () => {
  it("is keys after a key and touch after a pointer, on <html>", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }))
    expect(mode()).toBe("keys")
    window.dispatchEvent(new Event("pointerdown"))
    expect(mode()).toBe("touch")
  })

  it("is set by a key even when its handler stops it", () => {
    const button = document.body.appendChild(document.createElement("button"))
    button.addEventListener("keydown", event => event.stopPropagation())
    button.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", bubbles: true }))
    expect(mode()).toBe("keys")
    button.remove()
  })

  it("is pad when the pad says so", () => {
    setModality("pad")
    expect(mode()).toBe("pad")
  })
})
