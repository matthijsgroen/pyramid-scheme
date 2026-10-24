// @vitest-environment jsdom
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { mergeHomecomings, registerHomecoming, useHomecoming } from "./homecomingRegistry"

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
