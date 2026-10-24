import { describe, expect, it } from "vitest"
import { shopLootTotals } from "./lootTotals"
import { totalBuyable } from "./economyGuard"
import { priceFor } from "./pricing"
import { sellValueForItemId } from "@/data/sellables"
import type { FloorConfig, SideSection, SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})
const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  ...overrides,
})
const sub = (overrides: Partial<SubSection> = {}): SubSection => side(overrides)
const other: TreasureReward = { type: "somethingElse" }

// One reward of the mod on a puzzle, a chest, a path end, a sub-section end and shop stock, plus one it must ignore.
const world = (reward: TreasureReward): Record<string, SiteConfig[]> => ({
  a: [
    [
      floor({
        rewards: [reward],
        mainEndReward: reward,
        sideSections: [
          side({ rewards: [other], endReward: reward, sideSections: [sub({ rewards: [reward], endReward: other })] }),
          side({ encounter: "fez-shop", rewards: [reward, undefined, other] }),
        ],
      }),
    ],
  ],
})

describe("shopLootTotals", () => {
  const row = (rows: ReturnType<typeof shopLootTotals>, label: string) => rows.find(r => r.label === label)!

  it("counts coin drops and their coins wherever they lie, ignoring other types", () => {
    const rows = shopLootTotals(world({ type: "money", amount: 7 }))
    expect(row(rows, "Coin drops").found).toBe(5)
    expect(row(rows, "Coins")).toEqual({ label: "Coins", found: 35, unit: "coins" })
    expect(row(rows, "Sellables").found).toBe(0)
  })

  it("counts sellables and their sell value", () => {
    const rows = shopLootTotals(world({ type: "sellable", itemId: "sell_stone_1" }))
    expect(row(rows, "Sellables").found).toBe(5)
    expect(row(rows, "Sell value")).toEqual({
      label: "Sell value",
      found: 5 * sellValueForItemId("sell_stone_1"),
      unit: "coins",
    })
  })

  it("adds coins and sell value as income against everything buyable", () => {
    const configs = {
      a: [
        [
          floor({
            rewards: [{ type: "money", amount: 10 }],
            mainEndReward: { type: "sellable", itemId: "sell_stone_1" },
            sideSections: [side({ encounter: "fez-shop", rewards: [{ type: "mapPiece", tombId: "t" }] })],
          }),
        ],
      ],
    }
    expect(row(shopLootTotals(configs), "Income against buyable stock")).toEqual({
      label: "Income against buyable stock",
      found: 10 + sellValueForItemId("sell_stone_1"),
      needed: totalBuyable(configs),
      unit: "coins",
    })
    expect(totalBuyable(configs)).toBe(priceFor({ type: "mapPiece", tombId: "t" }, "expert"))
  })
})
