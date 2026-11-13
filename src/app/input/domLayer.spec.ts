// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import type { InputAction } from "./actions"
import { domLayerHandler } from "./domLayer"

afterEach(() => {
  document.body.innerHTML = ""
})

const signal = (action: InputAction, extra: { repeat?: boolean; released?: boolean } = {}) => ({
  action,
  source: "pad" as const,
  repeat: extra.repeat ?? false,
  released: extra.released ?? false,
  target: null,
})

const button = (root: HTMLElement, label: string, at?: { left: number; top: number }) => {
  const el = root.appendChild(document.createElement("button"))
  el.textContent = label
  if (at) el.getBoundingClientRect = () => ({ ...at, width: 10, height: 10 }) as DOMRect
  return el
}

const dialog = () => {
  const root = document.body.appendChild(document.createElement("div"))
  root.tabIndex = -1
  return root
}

describe("back in a piece of the page", () => {
  it("presses its visible way back", () => {
    const root = dialog()
    const close = button(root, "Close")
    close.setAttribute("data-input-back", "")
    const onClose = vi.fn()
    close.addEventListener("click", onClose)
    expect(domLayerHandler(root)(signal({ kind: "back" }))).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does nothing where there is no way back", () => {
    const root = dialog()
    button(root, "Unpack")
    expect(domLayerHandler(root)(signal({ kind: "back" }))).toBe(false)
  })

  it("passes over a way back that is out of use", () => {
    const root = dialog()
    const inert = root.appendChild(document.createElement("div"))
    inert.setAttribute("inert", "")
    const close = button(inert, "Close")
    close.setAttribute("data-input-back", "")
    const onClose = vi.fn()
    close.addEventListener("click", onClose)
    expect(domLayerHandler(root)(signal({ kind: "back" }))).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("acts once for a held key, so its repeat cannot close the layer beneath too", () => {
    const root = dialog()
    const close = button(root, "Close")
    close.setAttribute("data-input-back", "")
    const onClose = vi.fn()
    close.addEventListener("click", onClose)
    domLayerHandler(root)(signal({ kind: "back" }, { repeat: true }))
    domLayerHandler(root)(signal({ kind: "back" }, { released: true }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe("menu in a piece of the page", () => {
  it("presses its settings, and does nothing without them", () => {
    const root = dialog()
    const plain = domLayerHandler(root)
    button(root, "Unpack")
    expect(plain(signal({ kind: "menu" }))).toBe(false)
    const gear = button(root, "Settings")
    gear.setAttribute("data-input-menu", "")
    const onSettings = vi.fn()
    gear.addEventListener("click", onSettings)
    expect(plain(signal({ kind: "menu" }))).toBe(true)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})

describe("moving and confirming in a piece of the page", () => {
  it("moves focus to the nearest control in that direction", () => {
    const root = dialog()
    const yes = button(root, "Yes", { left: 0, top: 0 })
    const no = button(root, "No", { left: 40, top: 0 })
    const below = button(root, "Below", { left: 0, top: 40 })
    yes.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "e" }))
    expect(document.activeElement).toBe(no)
    domLayerHandler(root)(signal({ kind: "move", dir: "w" }))
    domLayerHandler(root)(signal({ kind: "move", dir: "s" }))
    expect(document.activeElement).toBe(below)
  })

  it("focuses its first control when focus is on the layer itself", () => {
    const root = dialog()
    const first = button(root, "First", { left: 0, top: 40 })
    button(root, "Second", { left: 0, top: 0 })
    root.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "n" }))
    expect(document.activeElement).toBe(first)
  })

  it("stays put at the edge, and still keeps the key from scrolling the page", () => {
    const root = dialog()
    const only = button(root, "Only", { left: 0, top: 0 })
    only.focus()
    expect(domLayerHandler(root)(signal({ kind: "move", dir: "n" }))).toBe(true)
    expect(document.activeElement).toBe(only)
  })

  it("confirm clicks the focused control, and nothing when the layer itself has focus", () => {
    const root = dialog()
    const yes = button(root, "Yes")
    const onYes = vi.fn()
    yes.addEventListener("click", onYes)
    root.focus()
    expect(domLayerHandler(root)(signal({ kind: "confirm" }))).toBe(false)
    yes.focus()
    expect(domLayerHandler(root)(signal({ kind: "confirm" }))).toBe(true)
    expect(onYes).toHaveBeenCalledTimes(1)
  })
})
