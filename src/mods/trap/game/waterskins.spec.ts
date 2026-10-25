import { describe, expect, it } from "vitest"
import { allocateDistributions } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { SideSection, SiteConfig, Tier, TreasureReward } from "@/worldGen/types"
import { makeTrapWaterskins, waterskinShopStock, WATERSKIN_STOCK } from "./waterskins"

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

// Made-up slots: `sites` sites per tier with `perSite` loot puzzle slots each, plus slots no waterskin may take —
// a chest, a path end, a fez-shop stock slot tagged for something else and a trap room in every site.
const slotWorld = (sitesPerTier: Partial<Record<Tier, number>>, perSite: number): TestSlot[] => {
  const slots: TestSlot[] = []
  for (const [tier, sites] of Object.entries(sitesPerTier) as [Tier, number][]) {
    for (let s = 0; s < sites; s++) {
      const siteId = `${tier}_${s}:0`
      for (let p = 0; p < perSite; p++) slots.push(slot(`${siteId}#${p}`, { tier, siteId, puzzleSeq: p }))
      slots.push(slot(`${siteId}:chest`, { tier, kind: "end", rewardPriority: 100 }))
      slots.push(slot(`${siteId}:end`, { tier, kind: "end", rewardPriority: 60 }))
      slots.push(
        slot(`${siteId}:shop`, { tier, kind: "end", rewardPriority: 0, encounter: "fez-shop", preference: "made-up" })
      )
      slots.push(slot(`${siteId}:trap`, { tier, siteId, puzzleSeq: perSite + 1, rewardPriority: 0 }))
    }
  }
  return slots
}

// A made-up world holding `traps[tier]` trap rooms per tier, one trapped section each.
const trapWorld = (traps: Partial<Record<Tier, number>>): Record<string, SiteConfig[]> => {
  const sections: SideSection[] = (Object.entries(traps) as [Tier, number][])
    .filter(([, n]) => n > 0)
    .map(([difficulty, n]) => ({ pathPuzzles: n, difficulty, end: "treasure", encounter: "trap" }))
  return {
    "made-up": [
      [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: sections }],
    ],
  }
}

const RATIO = 0.5

const place = (slots: TestSlot[], configs: Record<string, SiteConfig[]> = {}): TestSlot[] => {
  allocateDistributions(new Set<Slot>(slots), [makeTrapWaterskins(RATIO)], configs)
  return slots.filter(s => s.filled.some(r => r?.type === "waterskin"))
}

const countByTier = (slots: readonly TestSlot[]) => {
  const counts: Partial<Record<Tier, number>> = {}
  for (const s of slots) counts[s.tier] = (counts[s.tier] ?? 0) + 1
  return counts
}

const all = { starter: 2, junior: 2, expert: 3, master: 3, wizard: 3 }
const traps = { starter: 6, junior: 8, expert: 2, master: 0, wizard: 10 }

describe("trapWaterskins", () => {
  it("waterskins follow the traps per tier", () => {
    const counts = countByTier(place(slotWorld(all, 4), trapWorld(traps)))
    expect(counts).toEqual({ expert: 1, wizard: 5 })
  })

  it("places fewer than a tier's share when the tier has fewer slots", () => {
    const counts = countByTier(place(slotWorld({ expert: 1 }, 2), trapWorld({ expert: 20 })))
    expect(counts).toEqual({ expert: 2 })
  })

  it("lands only on expert-and-up puzzle slots that bear loot", () => {
    for (const s of place(slotWorld(all, 4), trapWorld({ starter: 9, junior: 9, expert: 9, master: 9, wizard: 9 }))) {
      expect(s.kind).toBe("puzzle")
      expect(s.rewardPriority).toBeGreaterThan(0)
      expect(["expert", "master", "wizard"]).toContain(s.tier)
    }
  })

  it("spreads a tier's share over its sites", () => {
    const placed = place(slotWorld({ wizard: 3 }, 4), trapWorld({ wizard: 6 }))
    expect(new Set(placed.map(s => s.siteId)).size).toBe(3)
  })

  it("ranks the same input the same way twice, whatever order slots arrive in", () => {
    const loot = makeTrapWaterskins(RATIO)
    const configs = trapWorld(traps)
    const eligible = slotWorld(all, 4).filter(s => loot.eligible!(s))
    const label = (slots: Slot[]) => slots.map(s => (s as TestSlot).label)
    expect(label(loot.rank!([...eligible].reverse(), configs))).toEqual(label(loot.rank!(eligible, configs)))
  })

  it("a tomb shop's waterskin placeholders are filled with waterskins, on top of the trap share", () => {
    const stock = (tier: Tier, n: number) =>
      slot(`${tier}-shop-${n}`, {
        tier,
        kind: "end",
        rewardPriority: 0,
        encounter: "fez-shop",
        preference: WATERSKIN_STOCK,
      })
    const shopSlots = [stock("expert", 0), stock("expert", 1), stock("wizard", 0)]
    const placed = place([...slotWorld(all, 4), ...shopSlots], trapWorld(traps))
    for (const s of shopSlots) expect(s.filled).toEqual([{ type: "waterskin" }])
    expect(placed.filter(s => s.kind === "puzzle")).toHaveLength(6)
  })

  it("no waterskin in a junior or starter shop", () => {
    const tombs = [
      { id: "made-up-starter", tier: "starter" as const },
      { id: "made-up-junior", tier: "junior" as const },
      { id: "made-up-expert", tier: "expert" as const },
      { id: "made-up-wizard", tier: "wizard" as const },
    ]
    const stock = waterskinShopStock(tombs)
    expect(stock.map(s => s.journeyId)).toEqual([
      "made-up-expert",
      "made-up-expert",
      "made-up-wizard",
      "made-up-wizard",
    ])
    expect(stock.every(s => s.prefers === WATERSKIN_STOCK && !s.required)).toBe(true)
    const juniorShop = slot("junior-shop", {
      tier: "junior",
      kind: "end",
      rewardPriority: 0,
      encounter: "fez-shop",
      preference: WATERSKIN_STOCK,
    })
    expect(makeTrapWaterskins(RATIO).eligible!(juniorShop)).toBe(false)
  })
})
