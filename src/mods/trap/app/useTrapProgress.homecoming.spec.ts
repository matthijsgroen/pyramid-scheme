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

let earned: Perk[] = []
vi.mock("@/app/SiteMap/perkContributions", () => ({ useMergedEarnedPerks: () => earned }))

const { useTrapProgress } = await import("./useTrapProgress")

describe("restoreHealth", () => {
  it("brings health back to the maximum after trap hits", async () => {
    earned = []
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.takeTrapDamage())
    expect(result.current.currentHealth).toBeLessThan(result.current.maxHealth)
    await act(async () => result.current.restoreHealth())
    expect(result.current.currentHealth).toBe(result.current.maxHealth)
  })

  it("fills to the raised ceiling when a max-health perk is earned", async () => {
    earned = [{ type: "max-health" }, { type: "max-health" }]
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.restoreHealth())
    expect(result.current.maxHealth).toBe(8)
    expect(result.current.currentHealth).toBe(8)
  })

  it("changes nothing at full health", async () => {
    earned = []
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.restoreHealth())
    expect(result.current.currentHealth).toBe(result.current.maxHealth)
  })
})
