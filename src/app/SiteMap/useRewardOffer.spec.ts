import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { MergedRewardContributions } from "./rewardContributions"
import { useRewardOffer } from "./useRewardOffer"

const consumable: TreasureReward = { type: "consumable", itemId: "bandage" }
const tombKey: TreasureReward = { type: "tombKey", keyId: "site-0-0" }

const setup = (contributions: Partial<MergedRewardContributions> = {}) => {
  const journeys = {
    markConsumableSkipped: vi.fn(),
    clearConsumableSkipped: vi.fn(),
  } as unknown as JourneyAPI
  const applyReward = vi.fn()
  const rewardContributions = {
    effects: {},
    canAccept: () => true,
    skip: () => false,
    ...contributions,
  } as MergedRewardContributions
  const hook = renderHook(() => useRewardOffer({ journeys, rewardContributions, applyReward }))
  return { hook, journeys, applyReward }
}

describe("useRewardOffer", () => {
  it("offers a won reward, and hands it over only once the player acknowledges it", () => {
    const { hook, applyReward } = setup()

    act(() => hook.result.current.offerFound(tombKey, "0:1,1", ["blue"]))

    expect(hook.result.current.pending?.reward).toBe(tombKey)
    expect(hook.result.current.pending?.keyColors).toEqual(["blue"])
    expect(applyReward).not.toHaveBeenCalled()

    act(() => hook.result.current.pending!.onCollect())

    expect(applyReward).toHaveBeenCalledWith(tombKey)
  })

  it("stays silent about a reward a mod ignores — no popup, no side effect, nothing remembered", () => {
    const { hook, journeys, applyReward } = setup({ skip: () => true })

    act(() => hook.result.current.offerFound(consumable, "0:1,1"))

    expect(hook.result.current.pending).toBeNull()
    expect(journeys.markConsumableSkipped).not.toHaveBeenCalled()
    expect(applyReward).not.toHaveBeenCalled()
  })

  it("remembers a refused reward so the player can come back for it, and hands over nothing now", () => {
    const { hook, journeys, applyReward } = setup({ canAccept: () => false })

    act(() => hook.result.current.offerFound(consumable, "0:1,1"))

    expect(hook.result.current.pending?.consumableFull).toBe(true)
    expect(journeys.markConsumableSkipped).toHaveBeenCalledWith("0:1,1")

    act(() => hook.result.current.pending!.onCollect())

    expect(applyReward).not.toHaveBeenCalled()
  })

  it("clears the skip when the player finally takes a left-behind consumable, so the chest closes for good", () => {
    const { hook, journeys, applyReward } = setup()

    act(() => hook.result.current.offerSkipped(consumable, "0:1,1"))
    act(() => hook.result.current.pending!.onCollect())

    expect(applyReward).toHaveBeenCalledWith(consumable)
    expect(journeys.clearConsumableSkipped).toHaveBeenCalledWith("0:1,1")
  })

  it("keeps a left-behind consumable remembered when the pack is still full", () => {
    const { hook, journeys } = setup({ canAccept: () => false })

    act(() => hook.result.current.offerSkipped(consumable, "0:1,1"))

    expect(hook.result.current.pending?.consumableFull).toBe(true)
    // Already remembered from the first refusal — re-marking it would be a second write for one skip.
    expect(journeys.markConsumableSkipped).not.toHaveBeenCalled()
    expect(journeys.clearConsumableSkipped).not.toHaveBeenCalled()
  })

  it("clears the offer on dismissal, so the popup doesn't linger over the map", () => {
    const { hook } = setup()
    act(() => hook.result.current.offerFound(tombKey, "0:1,1"))

    act(() => hook.result.current.dismiss())

    expect(hook.result.current.pending).toBeNull()
  })
})
