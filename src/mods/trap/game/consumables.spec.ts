import { describe, it, expect } from "vitest"
import { trapConsumables, trapShopStock } from "./consumables"
import type { Slot } from "@/worldGen/slots"

// What trap is supposed to do with loot slots:
//  - trapConsumables: put a consumable on every EXPERT-or-harder PUZZLE slot it's handed (traps
//    arrive at expert, so no supplies in easy early tiers, and chests stay money/junk).
//  - trapShopStock: fill any leftover fez-shop stock slot with a (finite) consumable.
// Both only ever FILL — they never empty a slot.

const slot = (over: Partial<Slot>): Slot => ({
  ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
  journeyId: "j",
  tier: "expert",
  wardKeys: [],
  isPlaceholder: false,
  kind: "puzzle",
  rewardPriority: 60,
  siteId: "j:0",
  puzzleSeq: 0,
  assign: () => {},
  ...over,
})

describe("trapConsumables", () => {
  it("is eligible only on expert+ puzzle slots that bear loot", () => {
    expect(trapConsumables.eligible!(slot({ tier: "expert", kind: "puzzle", rewardPriority: 60 }))).toBe(true)
    expect(trapConsumables.eligible!(slot({ tier: "master", kind: "puzzle", rewardPriority: 60 }))).toBe(true)
    expect(trapConsumables.eligible!(slot({ tier: "starter", kind: "puzzle", rewardPriority: 60 }))).toBe(false) // too easy
    expect(trapConsumables.eligible!(slot({ tier: "expert", kind: "end", rewardPriority: 100 }))).toBe(false) // chest, not puzzle
    expect(trapConsumables.eligible!(slot({ tier: "expert", kind: "puzzle", rewardPriority: 0 }))).toBe(false) // trap room, loot-ineligible
  })

  it("fills every handed slot with a consumable (never empties)", () => {
    const filled: (unknown | undefined)[] = []
    const slots = [0, 1, 2].map(i => slot({ puzzleSeq: i, assign: r => filled.push(r) }))
    trapConsumables.fill(slots, {})
    expect(filled).toHaveLength(3)
    expect(filled.every(r => (r as { type: string }).type === "consumable")).toBe(true)
  })
})

describe("trapShopStock", () => {
  it("is eligible only on fez-shop slots", () => {
    expect(trapShopStock.eligible!(slot({ encounter: "fez-shop" }))).toBe(true)
    expect(trapShopStock.eligible!(slot({ encounter: undefined }))).toBe(false)
  })

  it("fills every handed shop slot with a consumable", () => {
    const filled: (unknown | undefined)[] = []
    const slots = [0, 1].map(i => slot({ encounter: "fez-shop", puzzleSeq: i, assign: r => filled.push(r) }))
    trapShopStock.fill(slots, {})
    expect(filled.every(r => (r as { type: string }).type === "consumable")).toBe(true)
  })
})
