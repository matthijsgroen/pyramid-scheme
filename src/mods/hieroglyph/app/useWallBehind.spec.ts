// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useWallBehind } from "./useWallBehind"

const box = (el: HTMLElement, rect: { left: number; top: number; width: number; height: number }) => {
  el.getBoundingClientRect = () =>
    ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height }) as DOMRect
}
const size = (el: HTMLElement, width: number, height: number, border = 0) => {
  Object.defineProperty(el, "clientWidth", { value: width })
  Object.defineProperty(el, "clientHeight", { value: height })
  Object.defineProperty(el, "clientLeft", { value: border })
  Object.defineProperty(el, "clientTop", { value: border })
}

/** A card the frame paints its wall on, its content wrapper, and a door somewhere inside. */
const frameWithDoor = () => {
  const card = document.createElement("div")
  const content = document.createElement("div")
  content.setAttribute("data-encounter-content", "")
  const door = document.createElement("div")
  card.append(content)
  content.append(door)
  document.body.append(card)
  return { card, door }
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
})

describe("the wall behind a door", () => {
  it("is the frame's own panel, at the frame's size, shifted by where the door stands in it", () => {
    const { card, door } = frameWithDoor()
    // A card 400 wide and 600 tall inside a 1px border: the square panel covers it at 600, overhanging 100 a side.
    box(card, { left: 10, top: 20, width: 402, height: 602 })
    size(card, 400, 600, 1)
    box(door, { left: 60, top: 120, width: 300, height: 300 })
    const ref = { current: door }
    const { result } = renderHook(() => useWallBehind(ref))
    expect(result.current).toEqual({ size: "600px 600px", position: "-149px -99px" })
  })

  it("is not lined up with anything outside an encounter frame", () => {
    const door = document.createElement("div")
    document.body.append(door)
    const ref = { current: door }
    const { result } = renderHook(() => useWallBehind(ref))
    expect(result.current).toBeUndefined()
  })
})
