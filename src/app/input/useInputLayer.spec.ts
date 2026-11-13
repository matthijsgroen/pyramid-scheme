// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { InputHandler } from "./actions"
import { useInputLayer } from "./useInputLayer"

const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", cancelable: true }))

describe(useInputLayer, () => {
  it("is a layer while mounted, over whatever mounted before it", () => {
    const below = vi.fn<InputHandler>(() => true)
    const above = vi.fn<InputHandler>(() => true)
    const first = renderHook(() => useInputLayer(below))
    const second = renderHook(() => useInputLayer(above))

    escape()
    expect(above).toHaveBeenCalledTimes(1)
    expect(below).not.toHaveBeenCalled()

    second.unmount()
    escape()
    expect(below).toHaveBeenCalledTimes(1)
    first.unmount()
  })

  it("is no layer while not open", () => {
    const below = vi.fn<InputHandler>(() => true)
    const closed = vi.fn<InputHandler>(() => true)
    const first = renderHook(() => useInputLayer(below))
    const second = renderHook(({ open }) => useInputLayer(closed, open), { initialProps: { open: false } })

    escape()
    expect(closed).not.toHaveBeenCalled()
    second.rerender({ open: true })
    escape()
    expect(closed).toHaveBeenCalledTimes(1)
    second.unmount()
    first.unmount()
  })

  it("calls the latest handler without reopening, so it keeps its place in the stack", () => {
    const old = vi.fn<InputHandler>(() => true)
    const latest = vi.fn<InputHandler>(() => true)
    const hook = renderHook(({ handler }) => useInputLayer(handler), { initialProps: { handler: old } })
    hook.rerender({ handler: latest })
    escape()
    expect(old).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
    hook.unmount()
  })
})
