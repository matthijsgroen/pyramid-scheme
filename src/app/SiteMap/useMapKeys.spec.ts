// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Direction } from "@/game/siteTypes"
import { useMapKeys } from "./useMapKeys"

type Arrows = ReadonlyMap<Direction, readonly [number, number]>
const RING: Arrows = new Map<Direction, readonly [number, number]>([
  ["n", [1, 4]],
  ["e", [3, 9]],
])
const WALKING: Arrows = new Map()
const NEXT_STOP: Arrows = new Map<Direction, readonly [number, number]>([["e", [3, 12]]])

const press = (code: string, init: KeyboardEventInit = {}, target: EventTarget = window) => {
  const event = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}
const release = (code: string) => window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }))

const mount = (props: Partial<Parameters<typeof useMapKeys>[0]> = {}) => {
  const onMove = vi.fn()
  const onConfirm = vi.fn()
  const onBack = vi.fn()
  const hook = renderHook((p: Parameters<typeof useMapKeys>[0]) => useMapKeys(p), {
    initialProps: { active: true, arrows: RING, onMove, onConfirm, onBack, ...props },
  })
  const rerender = (next: Partial<Parameters<typeof useMapKeys>[0]>) =>
    hook.rerender({ active: true, arrows: RING, onMove, onConfirm, onBack, ...next })
  return { onMove, onConfirm, onBack, rerender }
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("arrow keys on the map", () => {
  it.each([
    ["ArrowUp", [1, 4]],
    ["ArrowRight", [3, 9]],
    ["KeyW", [1, 4]],
    ["KeyD", [3, 9]],
  ])("%s taps the ring arrow pointing that way", (code, tap) => {
    const { onMove } = mount()
    const event = press(code)
    expect(onMove.mock.calls).toEqual([tap])
    // The map's scroll box must not scroll along.
    expect(event.defaultPrevented).toBe(true)
  })

  it("does nothing for a direction with no arrow", () => {
    const { onMove } = mount()
    press("ArrowDown")
    press("KeyA")
    expect(onMove).not.toHaveBeenCalled()
  })

  it("reads WASD by physical position, so the key labelled Z on AZERTY walks north", () => {
    const { onMove } = mount()
    press("KeyW", { key: "z" })
    press("KeyZ", { key: "w" })
    expect(onMove.mock.calls).toEqual([[1, 4]])
  })

  it("ignores the keyboard's own repeat: a held key walks on only once he arrives", () => {
    const { onMove, rerender } = mount()
    press("ArrowRight")
    rerender({ arrows: WALKING })
    press("ArrowRight", { repeat: true })
    press("ArrowRight", { repeat: true })
    expect(onMove).toHaveBeenCalledTimes(1)

    rerender({ arrows: NEXT_STOP })
    expect(onMove.mock.calls).toEqual([
      [3, 9],
      [3, 12],
    ])
  })

  it("stops at the next stop once the key is let go", () => {
    const { onMove, rerender } = mount()
    press("ArrowRight")
    rerender({ arrows: WALKING })
    release("ArrowRight")
    rerender({ arrows: NEXT_STOP })
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  it("never steers mid-walk: a key pressed while he walks has no arrow to tap", () => {
    const { onMove } = mount({ arrows: WALKING })
    press("ArrowUp")
    expect(onMove).not.toHaveBeenCalled()
  })

  it("does nothing while something is open over the map", () => {
    const { onMove, onConfirm, onBack } = mount({ active: false })
    press("ArrowUp")
    press("Enter")
    press("Escape")
    expect(onMove).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })

  it("leaves a key typed into a field, or pressed inside a dialog, to that field or dialog", () => {
    const { onMove, onBack } = mount()
    const input = document.body.appendChild(document.createElement("input"))
    const dialog = document.body.appendChild(document.createElement("div"))
    dialog.setAttribute("role", "dialog")
    const inDialog = dialog.appendChild(document.createElement("button"))
    press("KeyW", {}, input)
    press("ArrowUp", {}, inDialog)
    press("Escape", {}, inDialog)
    expect(onMove).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })

  it("leaves a shortcut with a modifier to the browser", () => {
    const { onMove } = mount()
    press("KeyD", { metaKey: true })
    press("KeyW", { ctrlKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })
})

describe("the prompt and the way back by key", () => {
  it.each(["Enter", "Space", "NumpadEnter"])("%s takes the prompt", code => {
    const { onConfirm } = mount()
    press(code)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("Enter with no prompt showing does nothing", () => {
    const { onConfirm } = mount({ onConfirm: undefined })
    const event = press("Enter")
    expect(onConfirm).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it("leaves Enter on a focused button to press that button, so nothing is pressed twice", () => {
    const { onConfirm } = mount()
    const button = document.body.appendChild(document.createElement("button"))
    press("Enter", {}, button)
    press("Space", {}, button)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("Escape asks for the way back once per press", () => {
    const { onBack } = mount()
    press("Escape")
    press("Escape", { repeat: true })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
