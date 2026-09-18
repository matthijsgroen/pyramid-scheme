import { describe, expect, it } from "vitest"
import { allocateDistributions, type Distribution } from "./slotAllocator"
import type { Slot } from "./slots"
import type { TreasureReward } from "./types"

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

describe("allocateDistributions — reward priority + empty quota", () => {
  const fillFirst: Distribution = {
    id: "fill",
    footprint: () => ({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    fill: taken => taken.forEach(s => s.assign({ type: "money", amount: 1 })),
  }

  it("offers highest-priority slots first — a capped distribution takes the highest rewardPriority", () => {
    const chest = slot({ weight: 100, kind: "end", seq: 0 })
    const puzzle = slot({ weight: 60, seq: 1 })
    const available = new Set<Slot>([puzzle, chest]) // insertion order puzzle-first on purpose
    allocateDistributions(available, [{ ...fillFirst, footprint: () => ({ min: 1, max: 1 }) }], {})
    expect((chest as unknown as { reward?: TreasureReward }).reward).toBeDefined() // highest-priority chest won
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

  it("empty% reserves the lowest-priority loot-eligible slots up front", () => {
    const slots = Array.from({ length: 10 }, (_, i) => slot({ weight: i < 5 ? 60 : 100, seq: i }))
    const available = new Set<Slot>(slots)
    allocateDistributions(available, [fillFirst], {}, 0.2) // reserve 2 of 10 (lowest priority = weight 60)
    const filled = slots.filter(s => (s as unknown as { reward?: TreasureReward }).reward !== undefined)
    expect(filled).toHaveLength(8)
    // the two reserved-empty are weight-60 (lowest priority), never weight-100 chests
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
