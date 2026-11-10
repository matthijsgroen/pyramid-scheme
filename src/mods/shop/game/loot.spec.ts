import { describe, expect, it } from "vitest"
import { allocateDistributions, type Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"
import { SELL_VALUE_BY_TIER } from "@/data/sellables"
import { makeShopMoneyEconomy, type JourneyTierOf, type ReleasedLoot } from "./loot"
import { groundLedger, incomeOf, runEconomyGuard } from "./economyGuard"
import { groundWorld, lens, purchase, tableOf, walkOver, type GroundJourney } from "./groundWorlds.testing"
import type { PurchaseTable } from "./purchases"

// Every made-up slot is a starter puzzle, so every junk drop is worth the stone sell value.
const STONE = SELL_VALUE_BY_TIER.stone

// Every made-up journey is a starter journey, and no made-up tier is released.
const MADE_UP = { released: {}, journeyTier: () => "starter" as const }

// The empty puzzles of a made-up world as loot slots, a slot of the journeys in `chests` ranked as a chest is, each of
// its journey's tier.
const slotsOf = (
  configs: Record<string, SiteConfig[]>,
  chests: readonly string[] = [],
  journeyTier: JourneyTierOf = () => "starter"
): Slot[] => {
  const slots: Slot[] = []
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        let puzzleSeq = 0
        const emit = (rewards: (TreasureReward | undefined)[] | undefined, hidden: boolean) =>
          rewards?.forEach((reward, i) => {
            if (reward !== undefined) return
            slots.push({
              ref: { journeyId, levelIndex, floorIndex },
              journeyId,
              address: `${journeyId}/${puzzleSeq}`,
              tier: journeyTier(journeyId) ?? "starter",
              wardKeys: [],
              isPlaceholder: false,
              kind: "puzzle",
              siteId: `${journeyId}:${levelIndex}`,
              puzzleSeq: puzzleSeq++,
              rewardPriority: chests.includes(journeyId) ? 100 : 60,
              ...(hidden ? { hidden: true } : {}),
              assign: r => {
                rewards[i] = r
              },
            })
          })
        emit(floor.rewards, false)
        for (const section of floor.sideSections) emit(section.rewards, !!section.hidden)
      })
    )
  return slots
}

// Builds the world, hands its empty puzzles to the money fill with a fresh walk over the world as it then stands.
const fill = (
  journeys: Record<string, GroundJourney>,
  table: PurchaseTable,
  {
    chests = [],
    also = [],
    economy = MADE_UP,
  }: { chests?: string[]; also?: Distribution[]; economy?: { released: ReleasedLoot; journeyTier: JourneyTierOf } } = {}
) => {
  const { configs } = groundWorld(journeys)
  const slots = slotsOf(configs, chests, economy.journeyTier)
  allocateDistributions(new Set(slots), [makeShopMoneyEconomy(table, economy), ...also], configs, 0, () => {
    const walk = walkOver(configs, journeys)
    return { walk, isKey: walk.isKey }
  })
  return { configs, slots, walk: walkOver(configs, journeys) }
}

const everyReward = (configs: Record<string, SiteConfig[]>): (TreasureReward | undefined)[] =>
  Object.values(configs).flatMap(sites =>
    sites.flatMap(site =>
      site.flatMap(floor => [
        floor.mainEndReward,
        ...(floor.rewards ?? []),
        ...floor.sideSections.flatMap((s: SubSection) => [s.endReward, ...(s.rewards ?? [])]),
      ])
    )
  )

const placedValue = (configs: Record<string, SiteConfig[]>): number =>
  everyReward(configs).reduce((sum, r) => sum + (r ? incomeOf(r) : 0), 0)

const rowsOf = (configs: Record<string, SiteConfig[]>, walk: ReturnType<typeof walkOver>, purchases: PurchaseTable) => {
  const ledger = groundLedger(configs, walk, { purchases })
  if (!("rows" in ledger)) throw new Error("over the cap")
  return ledger.rows
}

describe("shopMoneyEconomy fill", () => {
  it("covers the ground before a key, not only the world, when the chests lie behind the key", () => {
    // The rooms behind the key rank first (chests), so a fill sized for the world alone would put its money there.
    const key = purchase("K")
    const table = tableOf({ K: 10 * STONE, R: 20 * STONE })
    const journeys: Record<string, GroundJourney> = {
      start: { slots: 12, stock: [key] },
      behindK: { needs: ["purchase:K"], slots: 60, stock: [purchase("R")] },
    }
    const { configs, walk } = fill(journeys, table, { chests: ["behindK"] })

    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).not.toThrow()
    const rows = rowsOf(configs, walk, table)
    expect(rows.map(r => r.label)).toEqual(["nothing", "K"])
    for (const row of rows) expect(row.income).toBeGreaterThanOrEqual(Math.ceil(row.buyable * 1.1))
  })

  it("a ground with no free slot fails, naming it", () => {
    const table = tableOf({ K: 100 * STONE })
    expect(() =>
      fill({ start: { slots: 3, stock: [purchase("K")] }, behindK: { needs: ["purchase:K"], slots: 30 } }, table)
    ).toThrow(/with nothing bought, income \d+ is short of buyable \d+ by \d+/)
  })

  it("a slot in a hidden section only counts toward grounds that hold the detector", () => {
    const table = tableOf({ K: 10 * STONE })
    // The lens lies behind the key: the hidden puzzles are in no ground before it is bought.
    expect(() =>
      fill(
        {
          start: { slots: 2, hiddenSlots: 30, stock: [purchase("K")] },
          behindK: { needs: ["purchase:K"], mainEnd: lens },
        },
        table
      )
    ).toThrow(/with nothing bought, income \d+ is short of buyable/)

    // The lens lies before the shop: the hidden puzzles pay for the key.
    const { configs, walk } = fill(
      {
        start: { slots: 2, hiddenSlots: 30, stock: [purchase("K")], mainEnd: lens },
        behindK: { needs: ["purchase:K"] },
      },
      table
    )
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).not.toThrow()
  })

  it("no allowance is added", () => {
    // Shops that sell nothing get the one-of-each set and nothing more.
    const bare = fill({ start: { slots: 40 } }, tableOf({}))
    expect(placedValue(bare.configs)).toBe(5 * STONE)

    // Shops that sell something get what they sell, with its margin, and at most one drop more.
    const table = tableOf({ K: 40 * STONE })
    const sold = fill({ start: { slots: 80, stock: [purchase("K")] } }, table)
    expect(placedValue(sold.configs)).toBeGreaterThanOrEqual(44 * STONE)
    expect(placedValue(sold.configs)).toBeLessThan(45 * STONE)
  })

  it("every placeholder the fill does not use is cleared, a puzzle slot's included", () => {
    const table = tableOf({ K: 4 * STONE })
    const { configs } = fill({ start: { slots: 40, stock: [purchase("K")] } }, table)
    expect(everyReward(configs).some(r => r?.type === "fragmentSlot")).toBe(false)
    // Some puzzles the money did not need are empty again.
    expect(configs.start[0][0].rewards!.filter(r => r === undefined).length).toBeGreaterThan(0)
  })

  it("every chest still holds loot when no ground needs it, since an empty end changes the floor's key hosts", () => {
    const journeys = { start: { slots: 40 } }
    const { configs } = groundWorld(journeys)
    const chests = Array.from({ length: 10 }, () => ({ reward: undefined as TreasureReward | undefined }))
    const endSlots: Slot[] = chests.map((chest, i) => ({
      ref: { journeyId: "start", levelIndex: 0, floorIndex: 0 },
      journeyId: "start",
      tier: "starter",
      wardKeys: [],
      isPlaceholder: true,
      kind: "end",
      siteId: "start:0",
      puzzleSeq: 100 + i,
      rewardPriority: 100,
      assign: r => {
        chest.reward = r
      },
    }))
    allocateDistributions(
      new Set([...slotsOf(configs), ...endSlots]),
      [makeShopMoneyEconomy(tableOf({}), MADE_UP)],
      configs,
      0,
      () => {
        const walk = walkOver(configs, journeys)
        return { walk, isKey: walk.isKey }
      }
    )
    expect(chests.map(c => c.reward?.type).filter(t => t !== "sellable" && t !== "money")).toEqual([])
  })

  it("covers stock a distribution registered after it put in a shop", () => {
    const table = tableOf({ K: 10 * STONE, X: 0 })
    const stocker: Distribution = {
      id: "made-up-stocker",
      eligible: () => false,
      footprint: () => ({ min: 0, max: 0 }),
      fill: (_, configs) => {
        configs.start[0][0].sideSections[0].rewards!.push(purchase("K"))
      },
    }
    const { configs, walk } = fill({ start: { slots: 40, stock: [purchase("X")] } }, table, { also: [stocker] })
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).not.toThrow()
    expect(placedValue(configs)).toBeGreaterThanOrEqual(11 * STONE)
  })

  it("hard-fails a present tier with fewer slots than its collectibles", () => {
    // ≥25 slots total (clears the allocator's min), but the stone tier has only 3 (<5 items) → the
    // shop fill's own per-tier completeness check fires.
    const { configs } = groundWorld({ start: { slots: 28 } })
    const slots = slotsOf(configs).map((slot, i) => ({ ...slot, tier: i < 3 ? "starter" : "wizard" }) as Slot)
    expect(() =>
      allocateDistributions(new Set(slots), [makeShopMoneyEconomy(tableOf({}), MADE_UP)], configs, 0, () => {
        const walk = walkOver(configs, { start: {} })
        return { walk, isKey: walk.isKey }
      })
    ).toThrow(/completeness/)
  })
})

describe("shopMoneyEconomy fill, a tier at a time", () => {
  // Two made-up tiers, both open from the start, so one ground holds both tiers' rooms and both shops.
  const TIERS: Record<string, "junior" | "expert"> = { low: "junior", high: "expert" }
  const byTier = (released: ReleasedLoot = {}) => ({ released, journeyTier: (id: string) => TIERS[id] })
  const table = tableOf({ K: 10 * STONE, R: 20 * STONE, S: 30 * STONE })
  const low: GroundJourney = { slots: 30, stock: [purchase("K")] }

  it("a change in a higher tier leaves a lower tier's fill untouched", () => {
    const before = fill({ low, high: { slots: 40, stock: [purchase("R")] } }, table, { economy: byTier() })
    const after = fill({ low, high: { slots: 60, stock: [purchase("R"), purchase("S")] } }, table, {
      economy: byTier(),
    })
    expect(after.configs.high).not.toEqual(before.configs.high)
    expect(after.configs.low).toEqual(before.configs.low)
  })

  it("a higher tier counts the money a lower tier left in its grounds", () => {
    const high: GroundJourney = { slots: 40, stock: [purchase("R")] }
    const poor = fill({ low, high }, table, { economy: byTier() })
    const rich = fill({ low: { ...low, money: [30 * STONE] }, high }, table, { economy: byTier() })
    const placedIn = (configs: Record<string, SiteConfig[]>) =>
      configs.high[0][0].rewards!.reduce((sum, r) => sum + (r ? incomeOf(r) : 0), 0)
    expect(placedIn(rich.configs)).toBeLessThan(placedIn(poor.configs))
    expect(() =>
      runEconomyGuard(rich.configs, [], rich.walk, { purchases: tableOf({ K: 10 * STONE, R: 20 * STONE }) })
    ).not.toThrow()
  })

  it("a released tier holds exactly its record, and the tier above is filled around it", () => {
    const record = { "low/0": { type: "money", amount: 3 }, "low/1": { type: "sellable", itemId: "sell_stone_2" } }
    const { configs, walk } = fill({ low, high: { slots: 40, stock: [purchase("R")] } }, table, {
      economy: byTier({ junior: record }),
    })
    expect(configs.low[0][0].rewards!.slice(0, 2)).toEqual([record["low/0"], record["low/1"]])
    expect(configs.low[0][0].rewards!.slice(2).every(r => r === undefined)).toBe(true)
    expect(() =>
      runEconomyGuard(configs, [], walk, { purchases: tableOf({ K: 10 * STONE, R: 20 * STONE }) })
    ).not.toThrow()
  })

  it("a released record naming no slot the fill was handed stops the build", () => {
    expect(() =>
      fill({ low, high: { slots: 40, stock: [purchase("R")] } }, table, {
        economy: byTier({ junior: { "low/99": { type: "money", amount: 1 } } }),
      })
    ).toThrow(/low\/99/)
  })
})
