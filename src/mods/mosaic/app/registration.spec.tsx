// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import type { TreasureReward } from "@/game/siteTypes"
import "@/mods/mosaic/app"

describe("the mosaic mod, as the app loads it", () => {
  it("has Fez explain the mosaic once the popup announcing a found piece is dismissed", () => {
    const showConversation = vi.fn()
    const { result } = renderHook(() => useMergedRewardContributions(), {
      wrapper: ({ children }) => <FezContext value={{ showConversation }}>{children}</FezContext>,
    })

    result.current.seen.mosaicPiece?.({ type: "mosaicPiece", tier: "starter" } as TreasureReward)

    // Not a story beat: told once, and the tutorials setting can keep it quiet.
    expect(showConversation).toHaveBeenCalledWith("mosaicIntro")
  })
})
