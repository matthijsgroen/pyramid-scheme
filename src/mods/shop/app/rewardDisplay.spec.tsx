// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"
import { purchaseDisplay, purchaseText } from "./rewardDisplay"
import type { PurchaseTable } from "@/mods/shop/game/purchases"
import { purchaseRewardContribution } from "./usePurchases"

const t = (key: string) => key
const table: PurchaseTable = [
  { id: "mule", fact: "purchase:mule", price: 10, soldAt: { journeyId: "tomb_a" }, emoji: "🐴" },
  { id: "flag", fact: "purchase:flag", price: 20, soldAt: { journeyId: "tomb_b" } },
]
const mule = { type: "purchase", id: "mule" }

describe("a purchase in Fez's list", () => {
  it("shows its name and what it opens", () => {
    expect(purchaseText(mule, t, table)).toMatchObject({
      itemName: "purchases.mule.name",
      itemDescription: "purchases.mule.opens",
      icon: "🐴",
    })
  })

  it("stands in one emoji for a purchase the table gives none", () => {
    expect(purchaseText({ type: "purchase", id: "flag" }, t, table).icon).toBe(
      purchaseText({ type: "purchase", id: "griffin" }, t, table).icon
    )
  })
})

describe("a bought purchase's popup", () => {
  it("names it and sets what it opens apart", () => {
    const display = purchaseDisplay(mule, t, table)
    expect(display.itemName).toBe("purchases.mule.name")
    expect(display.itemEffectDescription).toBe("purchases.mule.opens")
    const { container } = render(<>{display.ItemVisual}</>)
    expect(container.textContent).toBe("🐴")
  })
})

describe("buying a purchase", () => {
  it("records it through the merged contributions", () => {
    const record = vi.fn()
    const merged = mergeContributions([purchaseRewardContribution({ ready: true, has: () => false, record })])
    merged.effects.purchase?.(mule, { journeyId: "j" })
    expect(record).toHaveBeenCalledWith("mule")
  })

  it("skips one already recorded, so Fez shows it sold out", () => {
    const merged = mergeContributions([
      purchaseRewardContribution({ ready: true, has: id => id === "mule", record: vi.fn() }),
    ])
    expect(merged.skip(mule)).toBe(true)
    expect(merged.skip({ type: "purchase", id: "ox" })).toBe(false)
    expect(merged.skip({ type: "money", amount: 5 })).toBe(false)
  })

  it("skips every purchase while the save is unread or unreadable, and nothing else", () => {
    const merged = mergeContributions([purchaseRewardContribution({ ready: false, has: () => false, record: vi.fn() })])
    expect(merged.skip(mule)).toBe(true)
    expect(merged.skip({ type: "money", amount: 5 })).toBe(false)
  })
})
