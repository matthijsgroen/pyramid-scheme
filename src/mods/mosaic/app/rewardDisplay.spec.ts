import { describe, expect, it } from "vitest"
import { registerMosaicRewardDisplay } from "./rewardDisplay"
import { getRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { MOSAIC_TIERS } from "../game/mosaicCurrency"

describe("mosaic reward display", () => {
  it("builds popup text from (reward, t) — first arg is the reward, not the translator", () => {
    registerMosaicRewardDisplay()
    const handler = getRewardHandler("mosaicPiece")
    expect(handler).toBeDefined()

    // Call it exactly as rewardText/RewardFlow does: (reward, t). A lone-`t` handler would bind the
    // reward object to its first param and call it as a function here — the black-screen crash.
    const t = (key: string) => `t:${key}`
    const text = handler!.text({ type: "mosaicPiece", tier: "starter" }, t)

    expect(text.itemName).toBe("t:chest.mosaicPiece")
    expect(text.itemDescription).toBe("t:chest.mosaicPieceDescription")
  })

  it("gives every register its own glass colour, so a popup says which panel it fills", () => {
    registerMosaicRewardDisplay()
    const handler = getRewardHandler("mosaicPiece")
    const t = (key: string) => `t:${key}`

    const icons = MOSAIC_TIERS.map(tier => handler!.text({ type: "mosaicPiece", tier }, t).icon)
    expect(new Set(icons).size).toBe(MOSAIC_TIERS.length)
  })

  it("falls back to the generic icon for a piece with no tier", () => {
    registerMosaicRewardDisplay()
    const handler = getRewardHandler("mosaicPiece")
    const t = (key: string) => `t:${key}`

    expect(handler!.text({ type: "mosaicPiece" }, t).icon).toBe("🔷")
  })
})
