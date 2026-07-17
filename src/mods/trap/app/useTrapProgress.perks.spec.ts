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

const { useTrapProgress } = await import("./useTrapProgress")

// The trap-owned perks (§8.0.1) turn on their effects: max-health raises the health cap (inc, cap
// 12), pack-mule raises the carry cap (2→4), consumable-detector raises the supplies level (toLevel).
describe("trap perk grants turn effects on", () => {
  it("max-health raises the cap by ½ heart per grant, capped at 12", async () => {
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(6)
    await act(async () => result.current.grantPerk({ type: "max-health" }))
    expect(result.current.maxHealth).toBe(7)
  })

  it("pack-mule raises the consumable carry cap to 4", async () => {
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.consumableCarryCap).toBe(2)
    await act(async () => result.current.grantPerk({ type: "pack-mule" }))
    expect(result.current.consumableCarryCap).toBe(4)
  })

  it("consumable-detector sets the supplies level (toLevel)", async () => {
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.consumableDetectorLevel).toBe(0)
    await act(async () => result.current.grantPerk({ type: "consumable-detector", level: 2 }))
    expect(result.current.consumableDetectorLevel).toBe(2)
  })

  it("ignores perks it does not own", async () => {
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.grantPerk({ type: "compass", level: 3 }))
    expect(result.current.maxHealth).toBe(6)
  })
})
