// @vitest-environment jsdom
import { fireEvent, render, renderHook, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { useInputRoot } from "./useInputRoot"

describe(useInputRoot, () => {
  it("makes the dialogs input layers, so Escape presses a dialog's way back", () => {
    const root = renderHook(() => useInputRoot())
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        isOpen
        title="Sure?"
        message="Made-up question"
        confirmText="Yes"
        cancelText="No"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.keyDown(screen.getByRole("dialog"), { code: "Escape" })
    expect(onCancel).toHaveBeenCalledTimes(1)
    root.unmount()
  })

  it("lets a game pad's B press a dialog's way back, and marks the input as pad", () => {
    const frames: FrameRequestCallback[] = []
    const pad = {
      index: 0,
      connected: true,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      axes: [0, 0],
    }
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(poll => frames.push(poll))
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] })
    const root = renderHook(() => useInputRoot())
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        isOpen
        title="Sure?"
        message="Made-up question"
        confirmText="Yes"
        cancelText="No"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    pad.buttons[1] = { pressed: true, value: 1 }
    frames.splice(0).forEach(poll => poll(0))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.input).toBe("pad")
    root.unmount()
    Reflect.deleteProperty(navigator, "getGamepads")
    vi.restoreAllMocks()
  })

  it("marks <html> with the brand of the pad last pressed", () => {
    const frames: FrameRequestCallback[] = []
    const buttons = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    const sony = { index: 0, id: "Wireless Controller (Vendor: 054c Product: 09cc)", connected: true, axes: [0, 0] }
    const other = { index: 1, id: "Made-up pad (Vendor: 1234)", connected: true, axes: [0, 0] }
    const pads = [
      { ...sony, buttons: buttons() },
      { ...other, buttons: buttons() },
    ]
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(poll => frames.push(poll))
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads })
    const root = renderHook(() => useInputRoot())
    const tap = (index: number) => {
      pads[index].buttons[0] = { pressed: true, value: 1 }
      frames.splice(0).forEach(poll => poll(0))
      pads[index].buttons[0] = { pressed: false, value: 0 }
      frames.splice(0).forEach(poll => poll(0))
    }
    tap(0)
    expect(document.documentElement.dataset.pad).toBe("playstation")
    tap(1)
    expect(document.documentElement.dataset.pad).toBe("xbox")
    root.unmount()
    Reflect.deleteProperty(navigator, "getGamepads")
    vi.restoreAllMocks()
  })

  it("marks <html> with the input last used", () => {
    const root = renderHook(() => useInputRoot())
    fireEvent.keyDown(window, { code: "KeyQ" })
    expect(document.documentElement.dataset.input).toBe("keys")
    fireEvent.pointerDown(document.body)
    expect(document.documentElement.dataset.input).toBe("touch")
    root.unmount()
  })
})
