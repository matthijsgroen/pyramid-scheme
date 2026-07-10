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

describe("applyTreasurePerk", () => {
  it("armor (trap) increments armorStacks, capped at 2", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.applyTreasurePerk("expert_a_4"))
    expect(result.current.perks.armorStacks).toBe(1)
    await act(async () => result.current.applyTreasurePerk("expert_a_4"))
    await act(async () => result.current.applyTreasurePerk("expert_a_4"))
    expect(result.current.perks.armorStacks).toBe(2)
  })

  it("pack-mule (trap) sets packMuleLevel to 1, idempotently", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.applyTreasurePerk("starter_a_3"))
    await act(async () => result.current.applyTreasurePerk("starter_a_3"))
    expect(result.current.perks.packMuleLevel).toBe(1)
  })

  it("max-health (trap) raises the public maxHealth field, capped at 12", async () => {
    const { result } = renderHook(() => useProgression())
    expect(result.current.maxHealth).toBe(6)
    await act(async () => result.current.applyTreasurePerk("starter_a_4"))
    expect(result.current.maxHealth).toBe(7)
  })

  it("compass (core) raises compassLevel to the granted level, never lowers it", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.applyTreasurePerk("master_a_4")) // level 2
    expect(result.current.perks.compassLevel).toBe(2)
    await act(async () => result.current.applyTreasurePerk("starter_a_2")) // level 1
    expect(result.current.perks.compassLevel).toBe(2)
  })

  it("scribes-eye (puzzle) surfaces through the same merged perks object as trap/core perks", async () => {
    const { result } = renderHook(() => useProgression())
    await act(async () => result.current.applyTreasurePerk("master_b_2")) // level 1
    expect(result.current.perks.scribesEyeLevel).toBe(1)
  })

  it("none/location-key/tier-unlock treasures don't touch any perk", async () => {
    const { result } = renderHook(() => useProgression())
    const before = { ...result.current.perks, maxHealth: result.current.maxHealth }
    await act(async () => result.current.applyTreasurePerk("junior_a_2")) // none
    await act(async () => result.current.applyTreasurePerk("expert_a_2")) // location-key
    await act(async () => result.current.applyTreasurePerk("junior_a_1")) // tier-unlock
    expect({ ...result.current.perks, maxHealth: result.current.maxHealth }).toEqual(before)
  })
})
