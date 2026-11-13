// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import { useInputRoot } from "@/app/input/useInputRoot"
import { CampHomeLayout } from "./CampHomeLayout"

const frames: FrameRequestCallback[] = []
const pad = {
  index: 0,
  connected: true,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  axes: [0, 0],
}
const tapPad = (button: number) =>
  act(() => {
    pad.buttons[button] = { pressed: true, value: 1 }
    frames.splice(0).forEach(poll => poll(0))
    pad.buttons[button] = { pressed: false, value: 0 }
    frames.splice(0).forEach(poll => poll(0))
  })

beforeEach(() => {
  frames.length = 0
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(poll => frames.push(poll))
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] })
  controlsInARow()
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, "getGamepads")
  vi.restoreAllMocks()
})

// The camp mounts before the app root starts listening, as it does in the app.
const camp = () => {
  const onOpen = vi.fn()
  const onSettings = vi.fn()
  render(
    <CampHomeLayout
      hud={
        <button data-input-menu onClick={onSettings}>
          Settings
        </button>
      }
      scene={<button onClick={onOpen}>Collection</button>}
      sceneRef={() => {}}
      card={<button>Set off</button>}
    />
  )
  const root = renderHook(() => useInputRoot())
  return { onOpen, onSettings, stop: () => root.unmount() }
}

describe("the camp as an input layer", () => {
  it("walks its controls with the arrows, and a pad's A opens the one focused", () => {
    const { onOpen, stop } = camp()
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByText("Collection"))
    tapPad(0)
    expect(onOpen).toHaveBeenCalledTimes(1)
    stop()
  })

  it("opens its settings with a pad's Start", () => {
    const { onSettings, stop } = camp()
    tapPad(9)
    expect(onSettings).toHaveBeenCalledTimes(1)
    stop()
  })
})
