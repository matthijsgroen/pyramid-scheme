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

describe("prev and next in a piece of the page", () => {
  const tabRow = (root: HTMLElement, labels: string[]) => {
    const row = root.appendChild(document.createElement("div"))
    row.setAttribute("role", "tablist")
    const tabs = labels.map(label => {
      const tab = button(row, label)
      tab.setAttribute("role", "tab")
      tab.addEventListener("click", () => tabs.forEach(t => t.setAttribute("aria-selected", String(t === tab))))
      return tab
    })
    tabs[0].setAttribute("aria-selected", "true")
    return tabs
  }

  it("turn its tabs, wrapping at either end", () => {
    const root = dialog()
    const [first, , last] = tabRow(root, ["Treasures", "Tablets", "Mosaic"])
    const turn = domLayerHandler(root)
    turn(signal({ kind: "prev" }))
    expect(last.getAttribute("aria-selected")).toBe("true")
    turn(signal({ kind: "next" }))
    expect(first.getAttribute("aria-selected")).toBe("true")
  })

  it("take the focus along when it is on the tabs, and leave it elsewhere", () => {
    const root = dialog()
    const [first, second] = tabRow(root, ["Treasures", "Tablets"])
    const close = button(root, "Close")
    first.focus()
    domLayerHandler(root)(signal({ kind: "next" }))
    expect(document.activeElement).toBe(second)
    close.focus()
    domLayerHandler(root)(signal({ kind: "next" }))
    expect(document.activeElement).toBe(close)
  })

  it("leave the arrows only the selected tab to land on", () => {
    const root = dialog()
    const close = button(root, "Close", { left: 40, top: 0 })
    const [selected, other] = tabRow(root, ["Treasures", "Tablets"])
    selected.tabIndex = 0
    other.tabIndex = -1
    selected.getBoundingClientRect = () => ({ left: 0, top: 40, width: 10, height: 10 }) as DOMRect
    other.getBoundingClientRect = () => ({ left: 40, top: 40, width: 10, height: 10 }) as DOMRect
    close.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "s" }))
    expect(document.activeElement).toBe(selected)
  })

  it("do nothing without tabs", () => {
    const root = dialog()
    button(root, "Close")
    expect(domLayerHandler(root)(signal({ kind: "next" }))).toBe(false)
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

describe("going back the way a move came", () => {
  // The control below sits between the two above, so the way up ties and the first in the page wins.
  const between = () => {
    const root = dialog()
    const left = button(root, "Left", { left: 0, top: 0 })
    const right = button(root, "Right", { left: 40, top: 0 })
    const below = button(root, "Below", { left: 20, top: 40 })
    return { root, left, right, below }
  }
  const move = (root: HTMLElement, dir: "n" | "e" | "s" | "w") => domLayerHandler(root)(signal({ kind: "move", dir }))

  it("ties to the first in the page without a move to go back on", () => {
    const { root, left, below } = between()
    below.focus()
    move(root, "n")
    expect(document.activeElement).toBe(left)
  })

  it("returns to the control the move started at, back and forth", () => {
    const { root, right, below } = between()
    right.focus()
    for (let i = 0; i < 2; i++) {
      move(root, "s")
      expect(document.activeElement).toBe(below)
      move(root, "n")
      expect(document.activeElement).toBe(right)
    }
  })

  it("takes the nearest again for any other direction", () => {
    const { root, left, right, below } = between()
    right.focus()
    move(root, "s")
    move(root, "n")
    move(root, "w")
    expect(document.activeElement).toBe(left)
    move(root, "s")
    expect(document.activeElement).toBe(below)
    move(root, "n")
    expect(document.activeElement).toBe(left)
  })

  it("takes the nearest when the focus went elsewhere since", () => {
    const { root, left, right, below } = between()
    right.focus()
    move(root, "s")
    left.focus()
    move(root, "e")
    expect(document.activeElement).toBe(right)
    below.focus()
    move(root, "n")
    expect(document.activeElement).toBe(left)
  })
})

describe("reaching a tab row", () => {
  it("lands on the selected tab from a control above its row, however far to the side the tab sits", () => {
    const root = dialog()
    const close = button(root, "Close", { left: 100, top: 0 })
    const row = root.appendChild(document.createElement("div"))
    row.setAttribute("role", "tablist")
    row.getBoundingClientRect = () => ({ left: 0, top: 40, width: 120, height: 10 }) as DOMRect
    const selected = button(row, "Treasures", { left: 0, top: 40 })
    selected.setAttribute("role", "tab")
    const other = button(row, "Tablets", { left: 100, top: 40 })
    other.setAttribute("role", "tab")
    other.tabIndex = -1
    button(root, "Cell", { left: 100, top: 80 })
    close.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "s" }))
    expect(document.activeElement).toBe(selected)
  })
})

describe("reaching a checkbox", () => {
  const wideAt = (el: HTMLElement, top: number) => {
    el.getBoundingClientRect = () => ({ left: 0, top, width: 400, height: 10 }) as DOMRect
    return el
  }
  // A wide field, a checkbox at the far left of its full-width label row, and a wide button below.
  const form = () => {
    const root = dialog()
    wideAt(button(root, "Language"), 0)
    const row = wideAt(root.appendChild(document.createElement("label")), 40)
    const checkbox = row.appendChild(document.createElement("input"))
    checkbox.type = "checkbox"
    checkbox.getBoundingClientRect = () => ({ left: 0, top: 40, width: 10, height: 10 }) as DOMRect
    const below = wideAt(button(root, "Travel card"), 80)
    return { root, checkbox, below }
  }

  it("lands on a checkbox from a wide control below its label row", () => {
    const { root, checkbox, below } = form()
    below.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "n" }))
    expect(document.activeElement).toBe(checkbox)
  })

  it("leaves a checkbox for the wide control below its label row", () => {
    const { root, checkbox, below } = form()
    checkbox.focus()
    domLayerHandler(root)(signal({ kind: "move", dir: "s" }))
    expect(document.activeElement).toBe(below)
  })
})
