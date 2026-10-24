// @vitest-environment jsdom
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
const { trapDamage } = await import("@/mods/trap/game/trapHealth")

// The trap-owned perks (§8.0.1) are derived from the treasures held, so holding the treasure IS
// holding the perk — there is no grant to miss, and no banked number that can drift from it.
describe("trap perks derived from the treasures held", () => {
  it("starts at the base values when no treasure carries a trap perk", () => {
    earned = [{ type: "compass", level: 3 }]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.armorStacks).toBe(0)
    expect(result.current.trapInsightStacks).toBe(0)
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

  it("a hit costs the trap damage, less with armor", async () => {
    earned = []
    const bare = renderHook(() => useTrapProgress())
    await act(async () => bare.result.current.takeTrapDamage())
    const bareLoss = 6 - bare.result.current.currentHealth
    expect(bareLoss).toBe(trapDamage(0))

    earned = [{ type: "armor" }]
    const armored = renderHook(() => useTrapProgress())
    await act(async () => armored.result.current.takeTrapDamage())
    expect(6 - armored.result.current.currentHealth).toBe(trapDamage(1))
  })

  it("ignores perks it does not own", () => {
    earned = [
      { type: "compass", level: 3 },
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
    expect(result.current.currentHealth).toBe(6)

    // The perk table is retuned and those treasures no longer carry max-health.
    earned = []
    rerender()
    expect(result.current.maxHealth).toBe(6)
    expect(result.current.currentHealth).toBeLessThanOrEqual(6)
  })
})

describe("drinking a waterskin", () => {
  it("restores one heart after trap hits", async () => {
    earned = []
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.takeTrapDamage())
    expect(result.current.currentHealth).toBe(2)
    await act(async () => result.current.drinkWaterskin())
    expect(result.current.currentHealth).toBe(4)
  })

  it("restores two hearts while a treasure carrying pack-mule is held", async () => {
    earned = [{ type: "pack-mule" }]
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.takeTrapDamage())
    expect(result.current.currentHealth).toBe(2)
    await act(async () => result.current.drinkWaterskin())
    expect(result.current.currentHealth).toBe(6)
  })

  it("changes nothing at full health", async () => {
    earned = [{ type: "pack-mule" }]
    const { result } = renderHook(() => useTrapProgress())
    expect(result.current.currentHealth).toBe(result.current.maxHealth)
    await act(async () => result.current.drinkWaterskin())
    expect(result.current.currentHealth).toBe(result.current.maxHealth)
  })
})
