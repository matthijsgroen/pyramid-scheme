// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import type { FC, ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import "@/mods/registerModApps"
import { FezContext } from "@/app/fez/context"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { piecesRequiredFor, TOMB_PIECES_REQUIRED } from "../game/piecesRequired"

const tombId = Object.keys(TOMB_PIECES_REQUIRED).find(id => piecesRequiredFor(id) > 1)!

describe("Fez on a map piece, once the popup is dismissed", () => {
  it("explains a piece, and says so when the map is whole", async () => {
    const showConversation = vi.fn()
    const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
      <FezContext value={{ showConversation }}>{children}</FezContext>
    )
    const { result } = renderHook(() => useMergedRewardContributions(), { wrapper })
    const reward = { type: "mapPiece", tombId } as const
    const take = async () => {
      await act(async () => {
        result.current.effects.mapPiece?.(reward, { journeyId: "some_journey" })
        await new Promise(r => setTimeout(r, 50))
      })
      result.current.seen.mapPiece?.(reward)
    }

    await take()
    expect(showConversation).toHaveBeenLastCalledWith("mapPiece")

    for (let i = 1; i < piecesRequiredFor(tombId); i++) await take()
    expect(showConversation).toHaveBeenLastCalledWith("mapComplete")
  })
})
