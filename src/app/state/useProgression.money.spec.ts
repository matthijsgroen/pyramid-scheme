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

const { useProgression } = await import("./useProgression")

describe("money", () => {
  it("starts at 0", () => {
    const { result } = renderHook(() => useProgression())
    expect(result.current.money).toBe(0)
  })

  it("addMoney increases the balance", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.addMoney(50))
    expect(result.current.money).toBe(50)
  })

  it("spendMoney succeeds and deducts when funds are sufficient", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.addMoney(100))
    let ok = false
    act(() => {
      ok = result.current.spendMoney(40)
    })
    expect(ok).toBe(true)
    expect(result.current.money).toBe(60)
  })

  it("spendMoney fails and leaves the balance untouched when funds are insufficient", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.addMoney(10))
    let ok = true
    act(() => {
      ok = result.current.spendMoney(20)
    })
    expect(ok).toBe(false)
    expect(result.current.money).toBe(10)
  })
})
