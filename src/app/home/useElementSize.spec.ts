// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useElementSize } from "./useElementSize"

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void

const observers: { callback: Callback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []

class StubObserver {
  callback: Callback
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(callback: Callback) {
    this.callback = callback
    observers.push(this)
  }
}

afterEach(() => {
  observers.length = 0
  vi.unstubAllGlobals()
})

describe(useElementSize, () => {
  it("is zero until measured, then reports the size the observer delivers", () => {
    vi.stubGlobal("ResizeObserver", StubObserver)
    const { result } = renderHook(() => useElementSize())
    expect(result.current[1]).toEqual({ width: 0, height: 0 })

    act(() => result.current[0](document.createElement("div")))
    expect(observers[0].observe).toHaveBeenCalled()

    act(() => observers[0].callback([{ contentRect: { width: 320, height: 200 } }]))
    expect(result.current[1]).toEqual({ width: 320, height: 200 })
  })

  it("disconnects on unmount", () => {
    vi.stubGlobal("ResizeObserver", StubObserver)
    const { result, unmount } = renderHook(() => useElementSize())
    act(() => result.current[0](document.createElement("div")))

    unmount()

    expect(observers[0].disconnect).toHaveBeenCalled()
  })
})
