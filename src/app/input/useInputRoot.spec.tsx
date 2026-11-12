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

  it("marks <html> with the input last used", () => {
    const root = renderHook(() => useInputRoot())
    fireEvent.keyDown(window, { code: "KeyQ" })
    expect(document.documentElement.dataset.input).toBe("keys")
    fireEvent.pointerDown(document.body)
    expect(document.documentElement.dataset.input).toBe("touch")
    root.unmount()
  })
})
