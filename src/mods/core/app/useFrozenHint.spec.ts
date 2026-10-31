// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useFrozenHint } from "./useFrozenHint"

describe("useFrozenHint", () => {
  it("has no hint until it is frozen", () => {
    const { result } = renderHook(() => useFrozenHint(() => "a"))
    expect(result.current.hint).toBeUndefined()
  })

  it("keeps the value captured at freeze after the build input changes", () => {
    const { result, rerender } = renderHook(({ board }) => useFrozenHint(() => `step for ${board}`), {
      initialProps: { board: 1 },
    })
    act(() => result.current.freeze())
    rerender({ board: 2 })
    expect(result.current.hint).toBe("step for 1")
  })

  it("builds a fresh hint on the next freeze", () => {
    const { result, rerender } = renderHook(({ board }) => useFrozenHint(() => `step for ${board}`), {
      initialProps: { board: 1 },
    })
    act(() => result.current.freeze())
    rerender({ board: 2 })
    act(() => result.current.freeze())
    expect(result.current.hint).toBe("step for 2")
  })

  it("clears when dropped", () => {
    const { result } = renderHook(() => useFrozenHint(() => "a"))
    act(() => result.current.freeze())
    act(() => result.current.drop())
    expect(result.current.hint).toBeUndefined()
  })
})
