// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import type { MergedRewardContributions } from "./rewardContributions"
import { useRewardOffer } from "./useRewardOffer"

const money: TreasureReward = { type: "money", amount: 5 }
const tombKey: TreasureReward = { type: "tombKey", keyId: "site-0-0" }

const setup = (contributions: Partial<MergedRewardContributions> = {}) => {
  const applyReward = vi.fn()
  const rewardContributions = {
    effects: {},
    seen: {},
    skip: () => false,
    ...contributions,
  } as MergedRewardContributions
  const hook = renderHook(() => useRewardOffer({ rewardContributions, applyReward }))
  return { hook, applyReward }
}

describe("useRewardOffer", () => {
  it("offers a won reward, and hands it over only once the player acknowledges it", () => {
    const { hook, applyReward } = setup()

    act(() => hook.result.current.offerFound(tombKey, ["blue"]))

    expect(hook.result.current.pending?.reward).toBe(tombKey)
    expect(hook.result.current.pending?.keyColors).toEqual(["blue"])
    expect(applyReward).not.toHaveBeenCalled()

    act(() => hook.result.current.pending!.onCollect())

    expect(applyReward).toHaveBeenCalledWith(tombKey)
  })

  it("stays silent about a reward a mod ignores — no popup, no side effect", () => {
    const { hook, applyReward } = setup({ skip: () => true })

    act(() => hook.result.current.offerFound(money))

    expect(hook.result.current.pending).toBeNull()
    expect(applyReward).not.toHaveBeenCalled()
  })

  it("clears the offer on dismissal, so the popup doesn't linger over the map", () => {
    const { hook } = setup()
    act(() => hook.result.current.offerFound(tombKey))

    act(() => hook.result.current.dismiss())

    expect(hook.result.current.pending).toBeNull()
  })

  it("tells the reward's owner once the player has dismissed its popup, so it can speak without covering the find", () => {
    const seen = vi.fn()
    const { hook } = setup({ seen: { tombKey: seen } })
    act(() => hook.result.current.offerFound(tombKey))
    act(() => hook.result.current.pending!.onCollect())
    expect(seen).not.toHaveBeenCalled()

    act(() => hook.result.current.dismiss())

    expect(seen).toHaveBeenCalledWith(tombKey)
  })
})
