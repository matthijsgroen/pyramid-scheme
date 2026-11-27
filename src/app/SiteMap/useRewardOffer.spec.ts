// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import type { MergedRewardContributions } from "./rewardContributions"
import { useRewardOffer } from "./useRewardOffer"

const money: TreasureReward = { type: "money", amount: 5 }
const tombKey: TreasureReward = { type: "tombKey", keyId: "site-0-0" }

const setup = (contributions: Partial<MergedRewardContributions> = {}) => {
  const calls: string[] = []
  const applyReward = vi.fn(() => calls.push("apply"))
  const onTaken = vi.fn(() => calls.push("taken"))
  const rewardContributions = {
    effects: {},
    seen: {},
    skip: () => false,
    ...contributions,
  } as MergedRewardContributions
  const hook = renderHook(() => useRewardOffer({ rewardContributions, applyReward, onTaken }))
  return { hook, applyReward, onTaken, calls }
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

  it("hands a collected reward to onTaken once, right after applying it", () => {
    const { hook, applyReward, onTaken, calls } = setup()
    act(() => hook.result.current.offerFound(tombKey))

    act(() => hook.result.current.pending!.onCollect())

    expect(applyReward).toHaveBeenCalledWith(tombKey)
    expect(onTaken).toHaveBeenCalledTimes(1)
    expect(onTaken).toHaveBeenCalledWith(tombKey)
    expect(calls).toEqual(["apply", "taken"])
  })

  it("takes nothing for a skipped reward", () => {
    const { hook, applyReward, onTaken } = setup({ skip: () => true })

    act(() => hook.result.current.offerFound(money))

    expect(applyReward).not.toHaveBeenCalled()
    expect(onTaken).not.toHaveBeenCalled()
  })

  it("takes nothing for an offer dismissed without collecting", () => {
    const { hook, applyReward, onTaken } = setup()
    act(() => hook.result.current.offerFound(tombKey))

    act(() => hook.result.current.dismiss())

    expect(applyReward).not.toHaveBeenCalled()
    expect(onTaken).not.toHaveBeenCalled()
  })
})
