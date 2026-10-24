// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"

const drinkWaterskin = vi.fn()
vi.mock("./useTrapProgress", () => ({ useTrapProgress: () => ({ drinkWaterskin }) }))

const { useTrapRewardContribution } = await import("./rewardContribution")

const useMerged = () => mergeContributions([useTrapRewardContribution()])

describe("the waterskin reward", () => {
  beforeEach(() => drinkWaterskin.mockClear())

  it("drinks the waterskin when claimed through the merged contributions", () => {
    const { result } = renderHook(useMerged)
    result.current.effects.waterskin?.({ type: "waterskin" }, { journeyId: "j" })
    expect(drinkWaterskin).toHaveBeenCalledTimes(1)
  })

  it("is never refused", () => {
    const { result } = renderHook(useMerged)
    expect(result.current.canAccept({ type: "waterskin" })).toBe(true)
    expect(result.current.skip({ type: "waterskin" })).toBe(false)
  })
})
