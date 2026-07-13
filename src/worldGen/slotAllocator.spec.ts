import { describe, it, expect } from "vitest"
import { allocateDistributions, type Distribution } from "./slotAllocator"
import type { Slot } from "./slots"
import type { TreasureReward } from "./types"

// Minimal fake slot — only the fields the allocator touches, plus a spy on assign.
const makeSlot = (id: string, tier = "starter"): Slot & { filled: TreasureReward[] } => {
  const filled: TreasureReward[] = []
  return {
    ref: { journeyId: id, levelIndex: 0, floorIndex: 0 },
    journeyId: id,
    tier: tier as Slot["tier"],
    wardKeys: [],
    isPlaceholder: true,
    kind: "end",
    assign: r => filled.push(r),
    filled,
  }
}

const dist = (over: Partial<Distribution> & Pick<Distribution, "id" | "footprint">): Distribution => ({
  fill: () => {},
  ...over,
})

describe("allocateDistributions", () => {
  it("hands each distribution up to its footprint max, removes taken slots", () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")]
    const available = new Set<Slot>(slots)
    const handed: Slot[] = []
    allocateDistributions(
      available,
      [dist({ id: "x", footprint: () => ({ min: 0, max: 2 }), fill: s => handed.push(...s) })],
      {}
    )
    expect(handed).toHaveLength(2)
    expect(available.size).toBe(1) // one slot left for later passes
  })

  it("only allocates eligible slots", () => {
    const slots = [makeSlot("a", "starter"), makeSlot("b", "wizard")]
    const available = new Set<Slot>(slots)
    const handed: Slot[] = []
    allocateDistributions(
      available,
      [
        dist({
          id: "wiz-only",
          footprint: () => ({ min: 1, max: 5 }),
          eligible: s => s.tier === "wizard",
          fill: s => handed.push(...s),
        }),
      ],
      {}
    )
    expect(handed).toHaveLength(1)
    expect(handed[0].journeyId).toBe("b")
  })

  it("hard-fails when a distribution's min cannot be met", () => {
    const available = new Set<Slot>([makeSlot("a")])
    expect(() =>
      allocateDistributions(available, [dist({ id: "greedy", footprint: () => ({ min: 3, max: 3 }) })], {})
    ).toThrow(/greedy.*unplaceable/)
  })
})
