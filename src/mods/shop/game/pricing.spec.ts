import { describe, it, expect } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { SideSection, SiteConfig, TreasureReward } from "@/worldGen/types"
import { stockPrices } from "./economyGuard"
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

describe("waterskin stock", () => {
  it("prices a waterskin by the shop's tier, from expert up", () => {
    expect(priceFor({ type: "waterskin" }, "expert")).toBe(30)
    expect(priceFor({ type: "waterskin" }, "master")).toBe(40)
    expect(priceFor({ type: "waterskin" }, "wizard")).toBe(50)
  })

  it("a tomb shop's waterskin is priced by the tier of the shop that sells it", () => {
    const skin = (): TreasureReward => ({ type: "waterskin" })
    const [inMaster, inWizard] = [skin(), skin()]
    const shop = (difficulty: Difficulty, stock: TreasureReward): SideSection => ({
      pathPuzzles: 0,
      difficulty,
      end: "treasure",
      encounter: "fez-shop",
      rewards: [stock],
    })
    const configs: Record<string, SiteConfig[]> = {
      "made-up-tomb": [
        [
          {
            pathPuzzles: 1,
            difficulty: "master",
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: [shop("master", inMaster), shop("wizard", inWizard)],
          },
        ],
      ],
    }
    const price = stockPrices(configs, [])
    expect(price(inMaster)).toBe(40)
    expect(price(inWizard)).toBe(50)
  })
})
