// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSiteExit } from "./useSiteExit"

describe("useSiteExit", () => {
  it("starts the leaving transition once the exit chamber's own arrival prompt is taken", () => {
    const { result } = renderHook(() => useSiteExit())

    expect(result.current.leaving).toBe(false)

    act(() => result.current.arrived())

    expect(result.current.leaving).toBe(true)
  })
})
