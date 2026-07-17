import { describe, it, expect } from "vitest"
import { priceFor, CONSUMABLE_PRICES } from "./pricing"

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

  it("prices consumables by kind", () => {
    expect(priceFor({ type: "consumable", consumable: "bandage" }, "junior")).toBe(CONSUMABLE_PRICES.bandage)
    expect(priceFor({ type: "consumable", consumable: "oil" }, "junior")).toBe(CONSUMABLE_PRICES.oil)
    expect(priceFor({ type: "consumable", consumable: "trapTool" }, "junior")).toBe(CONSUMABLE_PRICES.trapTool)
  })

  it("returns 0 for a reward type it doesn't price (money/sellable/unknown)", () => {
    expect(priceFor({ type: "money", amount: 5 }, "junior")).toBe(0)
    expect(priceFor({ type: "sellable", itemId: "x" }, "junior")).toBe(0)
    expect(priceFor({ type: "consumable", consumable: "unknown" }, "junior")).toBe(0)
  })
})
