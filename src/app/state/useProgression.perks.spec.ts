import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

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

// The perk system is disregarded pending redesign — no code bumps a perk, so every perk stays at
// its baseline (maxHealth 6, armor 0, …). The treasure-grant path (applyTreasurePerk) is a no-op on
// the tomb-treasure mod now; core progression exposes only the disregarded baseline. (The
// registry-driven grant behavior this used to assert returns when perks are redesigned, §F.)
describe("perks (disregarded pending redesign)", () => {
  it("core progression exposes every perk at its baseline", () => {
    const { result } = renderHook(() => useProgression())
    expect(result.current.perks).toEqual({
      armorStacks: 0,
      trapInsightStacks: 0,
      packMuleLevel: 0,
      compassLevel: 0,
      consumableDetectorLevel: 0,
      detectionLevel: 0,
      scribesEyeLevel: 0,
    })
  })
})
