// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useCrossing } from "./useCrossing"

describe("useCrossing", () => {
  it("plays a crossing through a wall's cell as a squeeze, and a span as a ride", () => {
    const { result } = renderHook(() => useCrossing({ reducedMotion: false }))
    act(
      () =>
        void result.current.playTraversal({ kind: "narrowPassage", from: [0, 0], via: [0, 1], to: [0, 2], dir: "e" })
    )
    expect(result.current.squeeze).not.toBeNull()
    expect(result.current.ride).toBeNull()
    act(() => void result.current.playTraversal({ kind: "zipline", from: [2, 0], to: [2, 6], dir: "e" }))
    expect(result.current.ride).not.toBeNull()
  })
})
