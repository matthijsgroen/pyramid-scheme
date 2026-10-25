// @vitest-environment jsdom
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  homecomingPanels,
  mergeHomecomings,
  registerHomecoming,
  registerHomecomingPanel,
  useHomecoming,
} from "./homecomingRegistry"

describe("mergeHomecomings", () => {
  it("runs every handler once, in registration order", () => {
    const calls: string[] = []
    mergeHomecomings([() => calls.push("a"), () => calls.push("b")])()
    expect(calls).toEqual(["a", "b"])
  })

  it("is a no-op with no handlers", () => {
    expect(() => mergeHomecomings([])()).not.toThrow()
  })
})

describe("useHomecoming", () => {
  it("a handler sees the latest state of its hook", () => {
    const seen = vi.fn()
    let setValue: (n: number) => void = () => {}
    registerHomecoming(() => {
      const [value, set] = useState(0)
      setValue = set
      return () => seen(value)
    })
    const { result } = renderHook(() => useHomecoming())
    act(() => setValue(5))
    result.current()
    expect(seen).toHaveBeenCalledExactlyOnceWith(5)
  })
})

describe("homecomingPanels", () => {
  it("come back sorted by order, one per id", () => {
    const Panel = () => null
    registerHomecomingPanel({ id: "late", order: 20, Component: Panel })
    registerHomecomingPanel({ id: "early", order: 5, Component: Panel })
    registerHomecomingPanel({ id: "mid", order: 10, Component: Panel })
    registerHomecomingPanel({ id: "mid", order: 10, Component: Panel })
    expect(homecomingPanels().map(p => p.id)).toEqual(["early", "mid", "late"])
  })
})
