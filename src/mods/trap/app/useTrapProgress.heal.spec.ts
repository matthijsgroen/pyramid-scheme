// @vitest-environment jsdom
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
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
vi.mock("@/app/SiteMap/perkContributions", () => ({ useMergedEarnedPerks: () => [] }))
const playSound = vi.fn()
vi.mock("@/app/audio/audio", () => ({ playSound }))

const { useTrapProgress } = await import("./useTrapProgress")

beforeEach(() => playSound.mockClear())

describe("the heal sound", () => {
  it("coming home hurt plays the heal; coming home whole plays nothing", async () => {
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.restoreHealth())
    expect(playSound).not.toHaveBeenCalled()
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.restoreHealth())
    expect(playSound.mock.calls).toEqual([["trap.heartLost"], ["trap.heal"]])
  })

  it("every hit that costs hearts thuds once; with none left to lose it stays quiet", async () => {
    const { result } = renderHook(() => useTrapProgress())
    for (let i = 0; i < 8; i++) await act(async () => result.current.takeTrapDamage())
    expect(playSound.mock.calls.filter(([name]) => name === "trap.heartLost").length).toBe(3)
  })

  it("a waterskin drunk at full health plays nothing", async () => {
    const { result } = renderHook(() => useTrapProgress())
    await act(async () => result.current.drinkWaterskin())
    expect(playSound).not.toHaveBeenCalled()
    await act(async () => result.current.takeTrapDamage())
    await act(async () => result.current.drinkWaterskin())
    expect(playSound.mock.calls).toEqual([["trap.heartLost"], ["trap.heal"]])
  })
})
