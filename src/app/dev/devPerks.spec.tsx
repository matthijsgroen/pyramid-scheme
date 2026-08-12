import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import "@/mods/registerModApps"
import { useDevActions } from "@/app/dev/useDevActions"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useTrapProgress } from "@/mods/trap/app/useTrapProgress"
import { useTombTreasureProgress } from "@/mods/tombTreasure/app/useTombTreasureProgress"

// Regression: "All treasures + keys" granted every key by calling addTombKey directly, bypassing the
// claim path that used to dispatch the perk — so a playtest world had every treasure and NO perks,
// and the corridor detector's eye toggle never appeared. Deriving the perks from the keys held
// removes the bypass entirely: there is no longer a second step to skip.
describe("dev menu: All treasures + keys", () => {
  it("grants the perks along with the keys", async () => {
    const { result } = renderHook(() => ({
      actions: useDevActions(),
      levels: useMergedDetectorLevels(),
      trap: useTrapProgress(),
      tomb: useTombTreasureProgress(),
    }))

    expect(result.current.levels.corridor).toBe(0)

    await act(async () => {
      result.current.actions.find(a => a.label === "All treasures + keys")?.onClick()
      await new Promise(r => setTimeout(r, 100))
    })

    expect(result.current.tomb.tombKeyIds.has("master_b_5")).toBe(true)
    // Every tiered detector at its best level, and the stacking trap perks at their caps.
    expect(result.current.levels.corridor).toBe(4)
    expect(result.current.levels.compass).toBe(3)
    expect(result.current.levels.supplies).toBe(3)
    expect(result.current.trap.maxHealth).toBeGreaterThan(6)
    expect(result.current.trap.consumableCarryCap).toBe(4)
  })
})
