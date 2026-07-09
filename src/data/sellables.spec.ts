import { describe, expect, it } from "vitest"
import {
  ALL_SELLABLES,
  SELLABLES_BY_TIER,
  SELL_VALUE_BY_TIER,
  getSellableById,
  sellValueForItemId,
  sellablesForDifficulty,
} from "./sellables"
import { materialTierByDifficulty, type MaterialTier } from "./treasures"

const TIERS: MaterialTier[] = ["stone", "bronze", "silver", "gold", "divine"]

describe("SELLABLES_BY_TIER — structural invariants", () => {
  it("has exactly 5 items per tier, all tagged with that tier", () => {
    for (const tier of TIERS) {
      expect(SELLABLES_BY_TIER[tier]).toHaveLength(5)
      expect(SELLABLES_BY_TIER[tier].every(item => item.tier === tier)).toBe(true)
    }
  })

  it("has 25 items total, all with unique ids", () => {
    expect(ALL_SELLABLES).toHaveLength(25)
    expect(new Set(ALL_SELLABLES.map(i => i.id)).size).toBe(25)
  })
})

describe("sellablesForDifficulty", () => {
  it("maps each difficulty to its material tier's item list", () => {
    expect(sellablesForDifficulty("starter")).toBe(SELLABLES_BY_TIER[materialTierByDifficulty.starter])
    expect(sellablesForDifficulty("wizard")).toBe(SELLABLES_BY_TIER[materialTierByDifficulty.wizard])
  })
})

describe("getSellableById", () => {
  it("finds a known item", () => {
    expect(getSellableById("sell_divine_1")?.tier).toBe("divine")
  })

  it("returns undefined for an unknown id", () => {
    expect(getSellableById("not_a_real_item")).toBeUndefined()
  })
})

describe("sellValueForItemId", () => {
  it("returns the tier's sell value for a known item", () => {
    expect(sellValueForItemId("sell_stone_1")).toBe(SELL_VALUE_BY_TIER.stone)
    expect(sellValueForItemId("sell_divine_3")).toBe(SELL_VALUE_BY_TIER.divine)
  })

  it("returns 0 for an unknown item rather than throwing", () => {
    expect(sellValueForItemId("not_a_real_item")).toBe(0)
  })
})
