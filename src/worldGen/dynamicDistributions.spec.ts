import { describe, expect, it } from "vitest"
import { allocateDistributions, type Distribution } from "./slotAllocator"
import type { Slot } from "./slots"
import type { TreasureReward } from "./types"
import { shopMoneyEconomy } from "@/mods/shop/game/loot"
import { trapConsumables } from "@/mods/trap/game/consumables"

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

describe("allocateDistributions — eagerness + empty quota", () => {
  const fillFirst: Distribution = {
    id: "fill",
    footprint: () => ({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    fill: taken => taken.forEach(s => s.assign({ type: "money", amount: 1 })),
  }

  it("offers eager slots first — a capped distribution takes the highest rewardPriority", () => {
    const chest = slot({ weight: 100, kind: "end", seq: 0 })
    const puzzle = slot({ weight: 60, seq: 1 })
    const available = new Set<Slot>([puzzle, chest]) // insertion order puzzle-first on purpose
    allocateDistributions(available, [{ ...fillFirst, footprint: () => ({ min: 1, max: 1 }) }], {})
    expect((chest as unknown as { reward?: TreasureReward }).reward).toBeDefined() // eager chest won
    expect((puzzle as unknown as { reward?: TreasureReward }).reward).toBeUndefined()
  })

  it("weight-0 slots are never eligible for a weight>0 distribution", () => {
    const dead = slot({ weight: 0 })
    const live = slot({ weight: 60, seq: 1 })
    const available = new Set<Slot>([dead, live])
    allocateDistributions(available, [{ ...fillFirst, eligible: s => s.rewardPriority > 0 }], {})
    expect((dead as unknown as { reward?: TreasureReward }).reward).toBeUndefined()
    expect((live as unknown as { reward?: TreasureReward }).reward).toEqual({ type: "money", amount: 1 })
  })

  it("empty% reserves the least-eager loot-eligible slots up front", () => {
    const slots = Array.from({ length: 10 }, (_, i) => slot({ weight: i < 5 ? 60 : 100, seq: i }))
    const available = new Set<Slot>(slots)
    allocateDistributions(available, [fillFirst], {}, 0.2) // reserve 2 of 10 (least eager = weight 60)
    const filled = slots.filter(s => (s as unknown as { reward?: TreasureReward }).reward !== undefined)
    expect(filled).toHaveLength(8)
    // the two reserved-empty are weight-60 (least eager), never weight-100 chests
    const empties = slots.filter(s => (s as unknown as { reward?: TreasureReward }).reward === undefined)
    expect(empties.every(s => s.rewardPriority === 60)).toBe(true)
  })

  it("hard-fails when a distribution's min can't be met", () => {
    const available = new Set<Slot>([slot({ weight: 60 })])
    expect(() =>
      allocateDistributions(available, [{ ...fillFirst, footprint: () => ({ min: 5, max: 5 }) }], {})
    ).toThrow(/unplaceable/)
  })
})

describe("shopMoneyEconomy fill", () => {
  const reward = (s: Slot) => (s as unknown as { reward?: TreasureReward }).reward

  it("places ≥1 of each item per present tier (completeness) and hits the budget floor", () => {
    // Empty configs → budget floor = TOTAL_CONSUMABLE_BUYABLE (no authored shop prices). Enough
    // divine slots (50 each) to fund it with room for coins.
    const slots = Array.from({ length: 120 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    const available = new Set<Slot>(slots)
    allocateDistributions(available, [shopMoneyEconomy], {})
    const rewards = slots.map(reward).filter(Boolean) as TreasureReward[]
    const sellables = rewards.filter(r => r.type === "sellable") as unknown as { itemId: string }[]
    // all 5 divine collectibles appear ≥1 (materialTier for wizard difficulty = divine)
    const distinct = new Set(sellables.map(r => r.itemId))
    expect(distinct.size).toBe(5)
    const value =
      sellables.length * 50 +
      (rewards.filter(r => r.type === "money") as unknown as { amount: number }[]).reduce((a, r) => a + r.amount, 0)
    expect(value).toBeGreaterThanOrEqual(1760) // TOTAL_CONSUMABLE_BUYABLE floor
  })

  it("hard-fails a present tier with fewer slots than its collectibles", () => {
    // ≥25 slots total (clears the allocator's min), but the stone tier has only 3 (<5 items) → the
    // shop fill's own per-tier completeness check fires.
    const divine = Array.from({ length: 25 }, (_, i) => slot({ weight: 100, tier: "wizard", kind: "end", seq: i }))
    const stone = Array.from({ length: 3 }, (_, i) => slot({ weight: 100, tier: "starter", kind: "end", seq: 100 + i }))
    expect(() => allocateDistributions(new Set([...divine, ...stone]), [shopMoneyEconomy], {})).toThrow(/completeness/)
  })
})

describe("trapConsumables fill", () => {
  const reward = (s: Slot) => (s as unknown as { reward?: TreasureReward }).reward

  it("places consumables only on expert+ puzzle slots", () => {
    const starter = slot({ weight: 60, tier: "starter", seq: 0 })
    const expert = slot({ weight: 60, tier: "expert", seq: 1 })
    const available = new Set<Slot>([starter, expert])
    allocateDistributions(available, [trapConsumables], {})
    expect(reward(starter)).toBeUndefined() // below expert
    expect(reward(expert)).toMatchObject({ type: "consumable" })
  })
})
