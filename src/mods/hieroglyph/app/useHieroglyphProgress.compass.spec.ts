import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: <T>(_key: string, initialValue: T | (() => T)) => {
    const [state, setState] = useState(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
    return [
      state,
      (value: T | ((prev: T) => T)) => {
        setState(value)
        return Promise.resolve(value)
      },
    ]
  },
}))

const { useHieroglyphProgress } = await import("./useHieroglyphProgress")

// The compass target is the picker's product (§3C): set on Collection, read by core via the seam.
// It lives in the mod's own persisted state, so this proves the pick-target step end-to-end at the
// state layer (the full navigate-to-a-site UI flow isn't runnable headless — same harness limit as
// the other phases).
describe("compass target (Collection picker, §3C)", () => {
  it("starts null and round-trips a picked hieroglyph", async () => {
    const { result } = renderHook(() => useHieroglyphProgress())
    expect(result.current.compassTarget).toBeNull()
    await act(async () => result.current.setCompassTarget("d3"))
    expect(result.current.compassTarget).toBe("d3")
  })

  it("clears the target (the hunt bar's Stop action)", async () => {
    const { result } = renderHook(() => useHieroglyphProgress())
    await act(async () => result.current.setCompassTarget("d3"))
    await act(async () => result.current.setCompassTarget(null))
    expect(result.current.compassTarget).toBeNull()
  })
})
