import { describe, expect, it } from "vitest"
import {
  fragmentPrice,
  MOSAIC_PRICE,
  MAP_PIECE_PRICE,
  CONSUMABLE_PRICES,
  CONSUMABLE_STOCK_PER_VISIT,
  CONSUMABLE_STOCK_VALUE,
  TOTAL_CONSUMABLE_BUYABLE,
  NUM_SHOPS,
} from "./shopPricing"

// SHOP_PLAN.md "Prices (locked)" — these exact numbers are the economy guard's baseline.
describe("fragmentPrice", () => {
  it("scales 250 + 50×difficultyLevel, matching the locked price table", () => {
    expect(fragmentPrice("starter")).toBe(250)
    expect(fragmentPrice("junior")).toBe(300)
    expect(fragmentPrice("expert")).toBe(350)
    expect(fragmentPrice("master")).toBe(400)
    expect(fragmentPrice("wizard")).toBe(450)
  })
})

describe("locked flat prices", () => {
  it("mosaic and map piece match SHOP_PLAN.md", () => {
    expect(MOSAIC_PRICE).toBe(500)
    expect(MAP_PIECE_PRICE).toBe(1000)
  })
})

describe("consumable stock value", () => {
  it("totals 220 per shop (2 each of bandage/oil/trapTool)", () => {
    expect(CONSUMABLE_STOCK_PER_VISIT).toBe(2)
    expect(CONSUMABLE_STOCK_VALUE).toBe(
      (CONSUMABLE_PRICES.bandage + CONSUMABLE_PRICES.oil + CONSUMABLE_PRICES.trapTool) * CONSUMABLE_STOCK_PER_VISIT
    )
    expect(CONSUMABLE_STOCK_VALUE).toBe(220)
  })

  it("totals 1,760 across all 8 shops — the guard's fixed consumable baseline", () => {
    expect(NUM_SHOPS).toBe(8)
    expect(TOTAL_CONSUMABLE_BUYABLE).toBe(1760)
  })
})
