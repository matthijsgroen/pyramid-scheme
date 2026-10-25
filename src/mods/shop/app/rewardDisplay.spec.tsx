// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"
import { purchaseDisplay, purchaseText } from "./rewardDisplay"
import { purchaseRewardContribution } from "./usePurchases"

const t = (key: string) => key
const mule = { type: "purchase", id: "mule" }

describe("a purchase in Fez's list", () => {
  it("shows its name and what it opens", () => {
    expect(purchaseText(mule, t)).toMatchObject({
      itemName: "purchases.mule.name",
      itemDescription: "purchases.mule.opens",
    })
  })
})

describe("a bought purchase's popup", () => {
  it("names it and sets what it opens apart", () => {
    const display = purchaseDisplay(mule, t)
    expect(display.itemName).toBe("purchases.mule.name")
    expect(display.itemEffectDescription).toBe("purchases.mule.opens")
    const { container } = render(<>{display.ItemVisual}</>)
    expect(container.textContent).not.toBe("")
  })
})

describe("buying a purchase", () => {
  it("records it through the merged contributions", () => {
    const record = vi.fn()
    const merged = mergeContributions([purchaseRewardContribution({ has: () => false, record })])
    merged.effects.purchase?.(mule, { journeyId: "j" })
    expect(record).toHaveBeenCalledWith("mule")
  })

  it("skips one already recorded, so Fez shows it sold out", () => {
    const merged = mergeContributions([purchaseRewardContribution({ has: id => id === "mule", record: vi.fn() })])
    expect(merged.skip(mule)).toBe(true)
    expect(merged.skip({ type: "purchase", id: "ox" })).toBe(false)
    expect(merged.skip({ type: "money", amount: 5 })).toBe(false)
  })
})
