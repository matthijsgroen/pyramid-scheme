import { describe, expect, it } from "vitest"
import { keyAction, keyFallback } from "./keyMap"

const key = (code: string, extra: Partial<Parameters<typeof keyAction>[0]> = {}) =>
  keyAction({ code, key: "", ctrlKey: false, metaKey: false, altKey: false, ...extra })

describe("which action a key means", () => {
  it.each([
    ["ArrowUp", { kind: "move", dir: "n" }],
    ["KeyD", { kind: "move", dir: "e" }],
    ["Space", { kind: "confirm" }],
    ["NumpadEnter", { kind: "confirm" }],
    ["Escape", { kind: "back" }],
    ["Backspace", { kind: "erase" }],
    ["KeyZ", { kind: "undo" }],
    ["ShiftLeft", { kind: "alt" }],
    ["KeyN", { kind: "alt" }],
    ["Delete", { kind: "erase" }],
    ["BracketLeft", { kind: "prev" }],
    ["PageDown", { kind: "next" }],
    ["KeyH", { kind: "hint" }],
    ["Digit7", { kind: "value", value: 7 }],
    ["Numpad3", { kind: "value", value: 3 }],
  ])("%s", (code, action) => {
    expect(key(code)).toEqual(action)
  })

  it("reads letters by position, so the key labelled W on AZERTY (code KeyZ) is undo, not north", () => {
    expect(key("KeyW", { key: "z" })).toEqual({ kind: "move", dir: "n" })
    expect(key("KeyZ", { key: "w" })).toEqual({ kind: "undo" })
  })

  it("leaves a shortcut with a modifier to the browser, except Ctrl or Cmd with Z, which is undo", () => {
    expect(key("KeyW", { ctrlKey: true })).toBeUndefined()
    expect(key("Escape", { altKey: true })).toBeUndefined()
    expect(key("KeyZ", { metaKey: true })).toEqual({ kind: "undo" })
    expect(key("KeyZ", { ctrlKey: true })).toEqual({ kind: "undo" })
  })

  it("reads a key without a code by its name", () => {
    expect(keyAction({ code: "", key: "Escape", ctrlKey: false, metaKey: false, altKey: false })).toEqual({
      kind: "back",
    })
  })

  it("means nothing for a key it does not know", () => {
    expect(key("KeyQ")).toBeUndefined()
    expect(key("Digit0")).toBeUndefined()
  })

  it("goes back on Backspace where nothing erases, and has no fallback for other keys", () => {
    expect(keyFallback({ code: "Backspace", key: "", ctrlKey: false, metaKey: false, altKey: false })).toEqual({
      kind: "back",
    })
    expect(keyFallback({ code: "Delete", key: "", ctrlKey: false, metaKey: false, altKey: false })).toBeUndefined()
  })
})
