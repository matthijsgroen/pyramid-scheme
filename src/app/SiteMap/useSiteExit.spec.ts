import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSiteExit } from "./useSiteExit"

describe("useSiteExit", () => {
  it("asks rather than leaves when the player steps into the exit chamber", () => {
    const { result } = renderHook(() => useSiteExit())

    act(() => result.current.arrived())

    expect(result.current.prompting).toBe(true)
    expect(result.current.leaving).toBe(false)
  })

  it("keeps the player inside when they turn back at the exit", () => {
    const { result } = renderHook(() => useSiteExit())
    act(() => result.current.arrived())

    act(() => result.current.cancel())

    expect(result.current.prompting).toBe(false)
    expect(result.current.leaving).toBe(false)
  })

  it("hands over to the leaving transition once they confirm, and drops the question", () => {
    const { result } = renderHook(() => useSiteExit())
    act(() => result.current.arrived())

    act(() => result.current.confirm())

    expect(result.current.prompting).toBe(false)
    expect(result.current.leaving).toBe(true)
  })
})
