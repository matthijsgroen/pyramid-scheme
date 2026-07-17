import { describe, expect, it } from "vitest"
import { registerMosaicRewardDisplay } from "./rewardDisplay"
import { getRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"

describe("mosaic reward display", () => {
  it("builds popup text from (reward, t) — first arg is the reward, not the translator", () => {
    registerMosaicRewardDisplay()
    const handler = getRewardHandler("mosaicPiece")
    expect(handler).toBeDefined()

    // Call it exactly as rewardText/RewardFlow does: (reward, t). A lone-`t` handler would bind the
    // reward object to its first param and call it as a function here — the black-screen crash.
    const t = (key: string) => `t:${key}`
    const text = handler!.text({ type: "mosaicPiece" }, t)

    expect(text.itemName).toBe("t:chest.mosaicPiece")
    expect(text.itemDescription).toBe("t:chest.mosaicPieceDescription")
    expect(text.icon).toBe("🟦")
  })
})
