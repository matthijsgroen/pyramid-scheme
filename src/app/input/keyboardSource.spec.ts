// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InputSignal } from "./actions"
import { listenToKeyboard } from "./keyboardSource"

let used = true
const deliver = vi.fn((_signal: InputSignal) => used)
let stop = () => {}

beforeEach(() => {
  used = true
  deliver.mockClear()
  stop = listenToKeyboard(deliver)
})
afterEach(() => {
  stop()
  document.body.innerHTML = ""
})

const press = (code: string, init: KeyboardEventInit = {}, target: EventTarget = window) => {
  const event = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}
const lift = (code: string) => window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }))
const delivered = () => deliver.mock.calls.map(([signal]) => signal)

describe("the keyboard as an input source", () => {
  it("delivers a key as its action, and keeps a used key from the browser", () => {
    const button = document.body.appendChild(document.createElement("button"))
    const event = press("ArrowLeft", {}, button)
    expect(delivered()).toEqual([
      { action: { kind: "move", dir: "w" }, source: "keys", repeat: false, released: false, target: button },
    ])
    expect(event.defaultPrevented).toBe(true)
  })

  it("leaves a key nobody used to the browser", () => {
    used = false
    expect(press("Space").defaultPrevented).toBe(false)
  })

  it("passes the keyboard's own repeat along", () => {
    press("ArrowUp", { repeat: true })
    expect(delivered()[0].repeat).toBe(true)
  })

  it("lets a held key go on keyup, and every held key when the window loses focus", () => {
    press("ArrowUp")
    press("KeyD")
    lift("ArrowUp")
    window.dispatchEvent(new Event("blur"))
    const releases = delivered().filter(signal => signal.released)
    expect(releases.map(signal => signal.action)).toEqual([
      { kind: "move", dir: "n" },
      { kind: "move", dir: "e" },
    ])
  })

  it("leaves every key typed into a field to that field", () => {
    const input = document.body.appendChild(document.createElement("input"))
    const editable = document.body.appendChild(document.createElement("div"))
    editable.setAttribute("contenteditable", "true")
    press("Escape", {}, input)
    press("Backspace", {}, editable)
    expect(deliver).not.toHaveBeenCalled()
  })

  it("leaves Enter and Space on a focused button to press that button, but not Escape", () => {
    const button = document.body.appendChild(document.createElement("button"))
    press("Enter", {}, button)
    press("Space", {}, button)
    press("Escape", {}, button)
    expect(delivered().map(signal => signal.action.kind)).toEqual(["back"])
  })

  it("leaves a key something already handled", () => {
    const button = document.body.appendChild(document.createElement("button"))
    button.addEventListener("keydown", event => event.preventDefault())
    press("ArrowUp", {}, button)
    expect(deliver).not.toHaveBeenCalled()
  })
})
