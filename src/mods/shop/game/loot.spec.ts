import { describe, expect, it } from "vitest"
import { allocateDistributions, type Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { TreasureReward, SiteConfig } from "@/worldGen/types"
import { SELL_VALUE_BY_TIER } from "@/data/sellables"
import { MONEY_ALLOWANCE, shopMoneyEconomy } from "./loot"

// A fake loot slot — only the fields the allocator + mod fills read, plus a spy on assign.
const slot = (opts: { weight: number; tier?: Slot["tier"]; kind?: Slot["kind"]; seq?: number }): Slot => {
  const s = {
    ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
    journeyId: "j",
    tier: opts.tier ?? "starter",
    wardKeys: [],
    isPlaceholder: opts.kind !== "puzzle",
    kind: opts.kind ?? "puzzle",
    siteId: "j:0",
    puzzleSeq: opts.seq ?? 0,
    rewardPriority: opts.weight,
    reward: undefined as TreasureReward | undefined,
    assign(r: TreasureReward | undefined) {
      this.reward = r
    },
  }
  return s as Slot & { reward: TreasureReward | undefined }
}

describe("shopMoneyEconomy fill", () => {
  const reward = (s: Slot) => (s as unknown as { reward?: TreasureReward }).reward

  // A world with a single fez-shop selling N mosaic pieces → totalBuyable = N × 500 (priceFor),
  // the budget floor the shop's money economy must fund.
  const shopWorld = (mosaics: number): Record<string, SiteConfig[]> => ({
    j: [
      [
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          exitOrStaircase: "exit",
          sideSections: [
            {
              pathPuzzles: 0,
              difficulty: "starter",
              end: "treasure",
              encounter: "fez-shop",
              rewards: Array.from({ length: mosaics }, () => ({ type: "mosaicPiece" as const })),
            },
          ],
        },
      ],
    ],
  })

  it("places ≥1 of each item per present tier (completeness) and hits the budget floor", () => {
    // Shop stock worth 4 × 500 = 2000, plus the money allowance → the fill must fund that
    // floor. Enough divine slots (50 each) to fund it with room for coins.
    const slots = Array.from({ length: 120 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    const available = new Set<Slot>(slots)
    allocateDistributions(available, [shopMoneyEconomy], shopWorld(4))
    const rewards = slots.map(reward).filter(Boolean) as TreasureReward[]
    const sellables = rewards.filter(r => r.type === "sellable") as unknown as { itemId: string }[]
    // all 5 divine collectibles appear ≥1 (materialTier for wizard difficulty = divine)
    const distinct = new Set(sellables.map(r => r.itemId))
    expect(distinct.size).toBe(5)
    const value =
      sellables.length * SELL_VALUE_BY_TIER.divine +
      (rewards.filter(r => r.type === "money") as unknown as { amount: number }[]).reduce((a, r) => a + r.amount, 0)
    expect(value).toBeGreaterThanOrEqual(4 * 500 + MONEY_ALLOWANCE) // totalBuyable (4 mosaic × 500) + allowance
  })

  const placedValue = (slots: Slot[]) =>
    (slots.map(reward).filter(Boolean) as TreasureReward[]).reduce(
      (sum, r) =>
        sum +
        (r.type === "sellable" ? SELL_VALUE_BY_TIER.divine : 0) +
        (r.type === "money" ? (r as unknown as { amount: number }).amount : 0),
      0
    )

  it("places the priced stock plus the allowance, within the 10% ceiling", () => {
    const slots = Array.from({ length: 200 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    allocateDistributions(new Set<Slot>(slots), [shopMoneyEconomy], shopWorld(4))
    const floor = 4 * 500 + MONEY_ALLOWANCE
    expect(placedValue(slots)).toBeGreaterThanOrEqual(floor)
    expect(placedValue(slots)).toBeLessThanOrEqual(Math.round(floor * 1.1))
  })

  it("fills after a distribution registered after it, so its budget covers the stock that one put in a shop", () => {
    const slots = Array.from({ length: 200 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    const world = shopWorld(0)
    const stocker: Distribution = {
      id: "made-up-stocker",
      eligible: () => false,
      footprint: () => ({ min: 0, max: 0 }),
      fill: (_, configs) => {
        configs.j[0][0].sideSections[0].rewards!.push({ type: "mosaicPiece" }, { type: "mosaicPiece" })
      },
    }
    allocateDistributions(new Set<Slot>(slots), [shopMoneyEconomy, stocker], world)
    expect(placedValue(slots)).toBeGreaterThanOrEqual(2 * 500 + MONEY_ALLOWANCE)
  })

  it("still places the allowance when the shops sell nothing", () => {
    const slots = Array.from({ length: 200 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    allocateDistributions(new Set<Slot>(slots), [shopMoneyEconomy], shopWorld(0))
    expect(placedValue(slots)).toBeGreaterThanOrEqual(MONEY_ALLOWANCE)
    expect(placedValue(slots)).toBeLessThanOrEqual(Math.round(MONEY_ALLOWANCE * 1.1))
  })

  it("hard-fails a present tier with fewer slots than its collectibles", () => {
    // ≥25 slots total (clears the allocator's min), but the stone tier has only 3 (<5 items) → the
    // shop fill's own per-tier completeness check fires.
    const divine = Array.from({ length: 25 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    const stone = Array.from({ length: 3 }, (_, i) => slot({ weight: 100, tier: "starter", kind: "end", seq: 100 + i }))
    expect(() => allocateDistributions(new Set([...divine, ...stone]), [shopMoneyEconomy], {})).toThrow(/completeness/)
  })
})
