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

  describe("typing into a field", () => {
    const field = () => {
      const input = document.body.appendChild(document.createElement("input"))
      input.type = "number"
      return input
    }
    const press = (target: EventTarget, key: string) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
    afterEach(() => document.body.replaceChildren())

    it("stays touch when a digit is typed into a tapped number field", () => {
      const input = field()
      input.dispatchEvent(new Event("pointerdown", { bubbles: true }))
      press(input, "4")
      expect(mode()).toBe("touch")
    })

    it("stays touch for arrows inside the field, which the field keeps", () => {
      window.dispatchEvent(new Event("pointerdown"))
      press(field(), "ArrowLeft")
      expect(mode()).toBe("touch")
    })

    it.each(["Tab", "Escape", "Enter"])("is keys after %s, which leaves the field", key => {
      window.dispatchEvent(new Event("pointerdown"))
      press(field(), key)
      expect(mode()).toBe("keys")
    })

    it("is keys after an arrow on the document", () => {
      window.dispatchEvent(new Event("pointerdown"))
      press(document.body, "ArrowLeft")
      expect(mode()).toBe("keys")
    })

    it("stays keys when a keyboard player types a digit", () => {
      press(document.body, "ArrowDown")
      press(field(), "4")
      expect(mode()).toBe("keys")
    })
  })

  it("is pad when the pad says so", () => {
    setModality("pad")
    expect(mode()).toBe("pad")
  })
})

describe("the brand of pad", () => {
  const connect = (id: string) =>
    window.dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: { id } }))

  it("is marked on <html> by the pad that connects, without changing the input", () => {
    setModality("keys")
    connect("DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)")
    expect(document.documentElement.dataset.pad).toBe("playstation")
    expect(mode()).toBe("keys")
    connect("Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)")
    expect(document.documentElement.dataset.pad).toBe("xbox")
  })
})
