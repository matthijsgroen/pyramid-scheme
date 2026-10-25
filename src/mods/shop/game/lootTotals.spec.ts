import { describe, expect, it } from "vitest"
import { shopLootTotals } from "./lootTotals"
import { sellValueForItemId } from "@/data/sellables"
import { makeGateWalk } from "@/worldGen/gateWalk"
import { groundWorld, purchase, tableOf } from "./groundWorlds.testing"
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

// The rows a world gives with no purchase table, walked as the bake walks it.
const totalsOf = (configs: Record<string, SiteConfig[]>) =>
  shopLootTotals(configs, makeGateWalk({ configs, journeyMeta: { a: { tier: "expert" } }, support: {} }), [])

describe("shopLootTotals", () => {
  const row = (rows: ReturnType<typeof shopLootTotals>, label: string) => rows.find(r => r.label === label)!

  it("counts coin drops and their coins wherever they lie, ignoring other types", () => {
    const rows = totalsOf(world({ type: "money", amount: 7 }))
    expect(row(rows, "Coin drops").found).toBe(5)
    expect(row(rows, "Coins")).toEqual({ label: "Coins", found: 35, unit: "coins" })
    expect(row(rows, "Sellables").found).toBe(0)
  })

  it("counts sellables and their sell value", () => {
    const rows = totalsOf(world({ type: "sellable", itemId: "sell_stone_1" }))
    expect(row(rows, "Sellables").found).toBe(5)
    expect(row(rows, "Sell value")).toEqual({
      label: "Sell value",
      found: 5 * sellValueForItemId("sell_stone_1"),
      unit: "coins",
    })
  })

  it("lists purchases in shops and, for every ground, the money lying there against everything for sale there", () => {
    const { configs, walk } = groundWorld({
      start: { money: [10, 20], stock: [purchase("A"), purchase("banner")] },
      behindA: { needs: ["purchase:A"], money: [40], stock: [purchase("B")] },
    })
    const rows = shopLootTotals(configs, walk, tableOf({ A: 50, B: 30, banner: 15, missing: 5 }))
    expect(rows.slice(4)).toEqual([
      { label: "Purchases in shops", found: 3, needed: 4 },
      { label: "Money with nothing bought", found: 30, needed: 65, unit: "coins" },
      { label: "Money with A bought", found: 70, needed: 95, unit: "coins" },
    ])
  })
})
