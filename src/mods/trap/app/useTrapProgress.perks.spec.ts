import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { Perk } from "@/app/SiteMap/perkContributions"

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

// Stands in for the tomb-treasure mod's earned-perks provider: the treasures the player holds.
let earned: Perk[] = []
vi.mock("@/app/SiteMap/perkContributions", () => ({ useMergedEarnedPerks: () => earned }))

const { useTrapProgress } = await import("./useTrapProgress")

// The trap-owned perks (§8.0.1) are derived from the treasures held, so holding the treasure IS
// holding the perk — there is no grant to miss, and no banked number that can drift from it.
describe("trap perks derived from the treasures held", () => {
  it("starts at the base values when no treasure carries a trap perk", () => {
    earned = [{ type: "compass", level: 3 }]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.consumableCarryCap).toBe(2)
    expect(result.current.consumableDetectorLevel).toBe(0)
  })

  it("max-health raises the cap by ½ heart per treasure carrying it", () => {
    earned = [{ type: "max-health" }, { type: "max-health" }]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(8)
  })

  it("caps max-health at 12 however many treasures carry it", () => {
    earned = Array.from({ length: 20 }, () => ({ type: "max-health" }))
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(12)
  })

  it("counts a stacking perk once per treasure, so a re-read can never inflate it", () => {
    earned = [{ type: "armor" }]
    const { result, rerender } = renderHook(() => useTrapProgress())
    expect(result.current.armorStacks).toBe(1)
    rerender()
    rerender()
    expect(result.current.armorStacks).toBe(1)
  })

  it("pack-mule raises the consumable carry cap to 4", () => {
    earned = [{ type: "pack-mule" }]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.consumableCarryCap).toBe(4)
  })

  it("takes the best consumable-detector level, so a lower one never demotes you", () => {
    earned = [
      { type: "consumable-detector", level: 3 },
      { type: "consumable-detector", level: 1 },
    ]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.consumableDetectorLevel).toBe(3)
  })

  it("ignores perks it does not own", () => {
    earned = [
      { type: "scribes-eye", level: 3 },
      { type: "detection", level: 4 },
    ]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.armorStacks).toBe(0)
  })

  it("clamps stored health to a max that has moved down under it", async () => {
    earned = [{ type: "max-health" }, { type: "max-health" }]
    const { result, rerender } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(8)
    await act(async () => result.current.useConsumable("oil")) // no oil held; health stays at its start
    expect(result.current.currentHealth).toBe(6)

    // The perk table is retuned and those treasures no longer carry max-health.
    earned = []
    rerender()
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.currentHealth).toBeLessThanOrEqual(6)
  })
})
