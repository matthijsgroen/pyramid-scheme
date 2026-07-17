import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Money is a shop-owned currency stored in core's generic ledger (progression.ledger keyed by
// "money"). This exercises the ledger's grant/spend semantics through the money id.
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

const { useProgression } = await import("@/app/state/useProgression")

describe("money (ledger currency)", () => {
  it("starts at 0", () => {
    const { result } = renderHook(() => useProgression())
    expect(result.current.ledger.get("money")).toBe(0)
  })

  it("grant increases the balance", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.ledger.grant("money", 50))
    expect(result.current.ledger.get("money")).toBe(50)
  })

  it("spend succeeds and deducts when funds are sufficient", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.ledger.grant("money", 100))
    let ok = false
    act(() => {
      ok = result.current.ledger.spend("money", 40)
    })
    expect(ok).toBe(true)
    expect(result.current.ledger.get("money")).toBe(60)
  })

  it("spend fails and leaves the balance untouched when funds are insufficient", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.ledger.grant("money", 10))
    let ok = true
    act(() => {
      ok = result.current.ledger.spend("money", 20)
    })
    expect(ok).toBe(false)
    expect(result.current.ledger.get("money")).toBe(10)
  })
})
