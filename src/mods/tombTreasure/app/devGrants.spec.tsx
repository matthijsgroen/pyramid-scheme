// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import "@/mods/registerModApps"
import { useDevActions } from "@/app/dev/useDevActions"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useTombTreasureProgress } from "./useTombTreasureProgress"

// The dev grant hands out keys, and every perk the keys carry has to come with them — a granted
// world with no perks leaves the detectors invisible.
describe("dev menu: All treasures + keys", () => {
  it("grants the perks along with the keys", async () => {
    const { result } = renderHook(() => ({
      actions: useDevActions(),
      levels: useMergedDetectorLevels(),
      tomb: useTombTreasureProgress(),
    }))

    expect(result.current.levels.corridor).toBe(0)

    await act(async () => {
      result.current.actions.find(a => a.label === "All treasures + keys")?.onClick()
      await new Promise(r => setTimeout(r, 100))
    })

    expect(result.current.tomb.tombKeyIds.has("master_b_5")).toBe(true)
    // Every tiered detector at its best level.
    expect(result.current.levels.corridor).toBe(4)
    expect(result.current.levels.compass).toBe(3)
    expect(result.current.levels.supplies).toBe(3)
  })
})
