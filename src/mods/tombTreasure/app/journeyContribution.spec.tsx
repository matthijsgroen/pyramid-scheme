// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import "@/mods/registerModApps"
import { useMergedJourneyContributions } from "@/app/pages/journeyContributions"
import { useTombTreasureProgress } from "./useTombTreasureProgress"

// The travel screen asks these three questions of every journey it draws, and this mod answers for
// the tombs: a tomb with no map pieces is not on the map, one with some is a locked card, and a
// pyramid whose map-piece chest is open carries the mark.
describe("tomb-treasure's journey facts", () => {
  it("hides a tomb until its first map piece, and never hides a pyramid", () => {
    const { result } = renderHook(() => useMergedJourneyContributions())
    expect(result.current.hidden("starter_treasure_tomb")).toBe(true)
    expect(result.current.hidden("starter_1")).toBe(false)
  })

  it("locks a tomb on its own authored piece count, and locks no pyramid", () => {
    const { result } = renderHook(() => useMergedJourneyContributions())
    expect(result.current.lock("starter_treasure_tomb")).toMatchObject({ found: 0, required: 4 })
    expect(result.current.lock("expert_treasure_tomb_b")).toMatchObject({ required: 3 })
    expect(result.current.lock("starter_1")).toBeUndefined()
  })

  it("names the lock in the player's own language, so core needs no words of its own", () => {
    const { result } = renderHook(() => useMergedJourneyContributions())
    const { labels } = result.current.lock("starter_treasure_tomb")!
    for (const label of [labels.title, labels.requires, labels.unit, labels.howToUnlock]) {
      expect(label).toBeTruthy()
    }
  })

  it("marks a pyramid whose map piece the player has found", async () => {
    const { result } = renderHook(() => ({
      facts: useMergedJourneyContributions(),
      tomb: useTombTreasureProgress(),
    }))
    expect(result.current.facts.mark("starter_2")).toBeUndefined()

    // The mod slice persists through offline storage, so the write lands a tick later.
    await act(async () => {
      result.current.tomb.markMapPieceFound("starter_2")
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.facts.mark("starter_2")).toBe("📜")
  })
})
