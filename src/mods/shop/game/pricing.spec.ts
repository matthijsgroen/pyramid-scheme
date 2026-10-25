import { describe, it, expect } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { priceFor } from "./pricing"
import { purchaseFact, type PurchaseTable } from "./purchases"

describe("priceFor", () => {
  it("scales fragment price by the shop's tier", () => {
    expect(priceFor({ type: "hieroglyphFragment", hieroglyphId: "ra" }, "starter")).toBe(250)
    expect(priceFor({ type: "hieroglyphFragment", hieroglyphId: "ra" }, "junior")).toBe(300)
    expect(priceFor({ type: "hieroglyphFragment", hieroglyphId: "ra" }, "expert")).toBe(350)
    expect(priceFor({ type: "hieroglyphFragment", hieroglyphId: "ra" }, "master")).toBe(400)
    expect(priceFor({ type: "hieroglyphFragment", hieroglyphId: "ra" }, "wizard")).toBe(450)
  })

  it("prices mosaic + map pieces flat", () => {
    expect(priceFor({ type: "mosaicPiece" }, "junior")).toBe(500)
    expect(priceFor({ type: "mapPiece", tombId: "x" }, "junior")).toBe(1000)
  })

  it("returns 0 for a reward type it doesn't price (money/sellable/unknown)", () => {
    expect(priceFor({ type: "money", amount: 5 }, "junior")).toBe(0)
    expect(priceFor({ type: "sellable", itemId: "x" }, "junior")).toBe(0)
  })

  const table: PurchaseTable = [
    { id: "made-up-mule", fact: purchaseFact("made-up-mule"), price: 123, soldAt: { journeyId: "made-up-tomb" } },
  ]

  it("prices a purchase at its table price at every tier", () => {
    for (const tier of difficulties) expect(priceFor({ type: "purchase", id: "made-up-mule" }, tier, table)).toBe(123)
  })

  it("prices a purchase the table does not list at 0", () => {
    expect(priceFor({ type: "purchase", id: "made-up-yak" }, "expert", table)).toBe(0)
  })
})
