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

// The perk system is disregarded pending redesign — applyTreasurePerk is a no-op, so every perk
// stays at its baseline no matter which treasure is granted. (The registry-driven grant behavior
// this used to assert returns when perks are redesigned.)
describe("applyTreasurePerk (perks disregarded)", () => {
  it("leaves every perk at baseline — grants do nothing", async () => {
    const { result } = renderHook(() => useProgression())
    const before = { ...result.current.perks, maxHealth: result.current.maxHealth }
    await act(async () => result.current.applyTreasurePerk("expert_a_4")) // armor
    await act(async () => result.current.applyTreasurePerk("starter_a_4")) // max-health
    await act(async () => result.current.applyTreasurePerk("master_a_4")) // compass
    await act(async () => result.current.applyTreasurePerk("master_b_2")) // scribes-eye
    expect({ ...result.current.perks, maxHealth: result.current.maxHealth }).toEqual(before)
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.perks.armorStacks).toBe(0)
  })
})
