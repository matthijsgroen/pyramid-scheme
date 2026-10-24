// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"

const drinkWaterskin = vi.fn()
let packFull = false
vi.mock("./useTrapProgress", () => ({
  useTrapProgress: () => ({ drinkWaterskin, isConsumablePackFull: () => packFull, addConsumable: vi.fn() }),
}))

const { useTrapRewardContribution } = await import("./rewardContribution")

const useMerged = () => mergeContributions([useTrapRewardContribution()])

describe("the waterskin reward", () => {
  it("drinks the waterskin when claimed through the merged contributions", () => {
    const { result } = renderHook(useMerged)
    result.current.effects.waterskin?.({ type: "waterskin" }, { journeyId: "j" })
    expect(drinkWaterskin).toHaveBeenCalledTimes(1)
  })

  it("is never refused, even with a full pack", () => {
    packFull = true
    const { result } = renderHook(useMerged)
    expect(result.current.canAccept({ type: "waterskin" })).toBe(true)
    expect(result.current.skip({ type: "waterskin" })).toBe(false)
  })
})
