import { describe, expect, it } from "vitest"
import { allocateDistributions } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { Tier, TreasureReward } from "@/worldGen/types"
import { trapWaterskins, WATERSKIN_COUNT } from "./waterskins"

type TestSlot = Slot & { label: string; filled: (TreasureReward | undefined)[] }

const slot = (label: string, over: Partial<Slot>): TestSlot => {
  const filled: (TreasureReward | undefined)[] = []
  return {
    ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
    journeyId: "j",
    tier: "expert",
    wardKeys: [],
    isPlaceholder: false,
    kind: "puzzle",
    rewardPriority: 60,
    assign: r => filled.push(r),
    ...over,
    label,
    filled,
  }
}

// A made-up world: `sites` sites per tier with `perSite` loot puzzle slots each, plus slots no
// waterskin may take — a chest, a path end, a fez-shop stock slot and a trap room in every site.
const world = (sitesPerTier: Partial<Record<Tier, number>>, perSite: number): TestSlot[] => {
  const slots: TestSlot[] = []
  for (const [tier, sites] of Object.entries(sitesPerTier) as [Tier, number][]) {
    for (let s = 0; s < sites; s++) {
      const siteId = `${tier}_${s}:0`
      for (let p = 0; p < perSite; p++) slots.push(slot(`${siteId}#${p}`, { tier, siteId, puzzleSeq: p }))
      slots.push(slot(`${siteId}:chest`, { tier, kind: "end", rewardPriority: 100 }))
      slots.push(slot(`${siteId}:end`, { tier, kind: "end", rewardPriority: 60 }))
      slots.push(slot(`${siteId}:shop`, { tier, siteId, puzzleSeq: perSite, rewardPriority: 0, encounter: "fez-shop" }))
      slots.push(slot(`${siteId}:trap`, { tier, siteId, puzzleSeq: perSite + 1, rewardPriority: 0 }))
    }
  }
  return slots
}

const place = (slots: TestSlot[]): TestSlot[] => {
  allocateDistributions(new Set<Slot>(slots), [trapWaterskins], {})
  return slots.filter(s => s.filled.some(r => r?.type === "waterskin"))
}

const countByTier = (slots: readonly TestSlot[]) => {
  const counts: Partial<Record<Tier, number>> = {}
  for (const s of slots) counts[s.tier] = (counts[s.tier] ?? 0) + 1
  return counts
}

describe("trapWaterskins", () => {
  const full = { starter: 4, junior: 4, expert: 5, master: 4, wizard: 6 }

  it("places the capped count, no more, when more slots are eligible", () => {
    const placed = place(world(full, 8))
    expect(placed).toHaveLength(WATERSKIN_COUNT)
  })

  it("lands only on expert-and-up puzzle slots that bear loot", () => {
    const placed = place(world(full, 8))
    for (const s of placed) {
      expect(s.kind).toBe("puzzle")
      expect(s.rewardPriority).toBeGreaterThan(0)
      expect(s.encounter).not.toBe("fez-shop")
      expect(["expert", "master", "wizard"]).toContain(s.tier)
    }
  })

  it("spreads evenly over the three tiers when each has more than its share", () => {
    const counts = countByTier(place(world(full, 8)))
    const perTier = [counts.expert ?? 0, counts.master ?? 0, counts.wizard ?? 0]
    expect(Math.max(...perTier) - Math.min(...perTier)).toBeLessThanOrEqual(1)
  })

  it("hands a short tier's leftover share to the other tiers", () => {
    const counts = countByTier(place(world({ expert: 5, master: 1, wizard: 6 }, 8)))
    expect(counts.master).toBe(8)
    expect((counts.expert ?? 0) + (counts.wizard ?? 0)).toBe(WATERSKIN_COUNT - 8)
  })

  it("ranks the same input the same way twice", () => {
    const first = place(world(full, 8)).map(s => s.label)
    const second = place(world(full, 8)).map(s => s.label)
    expect(second).toEqual(first)
  })

  it("ranks by tier, site and path order, not by the order slots arrive in", () => {
    const eligible = world(full, 8).filter(s => trapWaterskins.eligible!(s))
    const label = (slots: Slot[]) => slots.map(s => (s as TestSlot).label)
    expect(label(trapWaterskins.rank!([...eligible].reverse()))).toEqual(label(trapWaterskins.rank!(eligible)))
  })

  it("never claims more than the eligible slots", () => {
    expect(place(world({ junior: 3, expert: 1 }, 4))).toHaveLength(4)
  })
})
