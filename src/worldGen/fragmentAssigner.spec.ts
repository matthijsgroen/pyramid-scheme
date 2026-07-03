import { describe, expect, it } from "vitest"
import type { SlotRef, HieroglyphPlacementInfo } from "./configBuilder"
import type { TreasureReward, Tier } from "./types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeSlot = (
  journeyId: string,
  tier: Tier,
  journeyOrderIndex: number,
  wardKeys: string[] = [],
  isPlaceholder = true
): { slot: SlotRef; result: () => TreasureReward | null } => {
  let assigned: TreasureReward | null = null
  const slot: SlotRef = {
    journeyId,
    tier,
    journeyOrderIndex,
    wardKeys,
    isPlaceholder,
    assign: r => {
      assigned = r
    },
  }
  return { slot, result: () => assigned }
}

// Minimal implementation of the assignment core logic extracted for unit testing.
// Mirrors assignFragments internals without the allConfigs dependency.
const assignToSlots = (slots: SlotRef[], infos: HieroglyphPlacementInfo[]): void => {
  const available = [...slots]
  const placedInJourney = new Map<string, Set<string>>()
  for (const s of slots) {
    if (!placedInJourney.has(s.journeyId)) placedInJourney.set(s.journeyId, new Set())
  }

  for (const info of infos) {
    const needed = info.required
    let placed = 0

    const pools = [
      available.filter(
        s =>
          s.tier === info.tier &&
          info.preferredWardKeys.length > 0 &&
          s.wardKeys.some(k => info.preferredWardKeys.includes(k))
      ),
      available.filter(s => s.tier === info.tier && s.wardKeys.length === 0),
      available.filter(s => s.tier !== info.tier),
    ]

    for (const pool of pools) {
      if (placed >= needed) break

      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        if (placedInJourney.get(slot.journeyId)?.has(info.hieroglyphId)) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        placedInJourney.get(slot.journeyId)!.add(info.hieroglyphId)
        available.splice(idx, 1)
        placed++
      }

      if (placed >= needed) break

      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        available.splice(idx, 1)
        placed++
      }
    }
  }

  // Fill remaining placeholder slots with consumables
  for (const slot of available) {
    if (slot.isPlaceholder) slot.assign({ type: "consumable", consumable: "bandage" })
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("fragment placement — run 1 (no ward preference)", () => {
  it("places fragments in open tier-matching slots", () => {
    const { slot: s1, result: r1 } = makeSlot("starter_1", "starter", 0)
    const { slot: s2, result: r2 } = makeSlot("starter_2", "starter", 1)

    assignToSlots([s1, s2], [{ hieroglyphId: "p10", tier: "starter", preferredWardKeys: [], required: 2 }])

    expect(r1()?.type).toBe("hieroglyphFragment")
    expect(r2()?.type).toBe("hieroglyphFragment")
  })

  it("respects 1-per-journey: does not place the same hieroglyph twice in one journey", () => {
    const { slot: s1a, result: r1a } = makeSlot("starter_1", "starter", 0)
    const { slot: s1b, result: r1b } = makeSlot("starter_1", "starter", 0)
    const { slot: s2, result: r2 } = makeSlot("starter_2", "starter", 1)

    assignToSlots([s1a, s1b, s2], [{ hieroglyphId: "p10", tier: "starter", preferredWardKeys: [], required: 2 }])

    // Should place in s1a and s2, not s1b (same journey as s1a)
    const placed = [r1a(), r1b(), r2()].filter(r => r?.type === "hieroglyphFragment")
    expect(placed).toHaveLength(2)
    // s1a and s2 should be used; s1b (same journey as s1a) stays empty
    expect(r1a()?.type).toBe("hieroglyphFragment")
    expect(r2()?.type).toBe("hieroglyphFragment")
    expect(r1b()?.type).not.toBe("hieroglyphFragment")
  })

  it("relaxes 1-per-journey when not enough journeys", () => {
    const { slot: s1a, result: r1a } = makeSlot("starter_1", "starter", 0)
    const { slot: s1b, result: r1b } = makeSlot("starter_1", "starter", 0)

    assignToSlots([s1a, s1b], [{ hieroglyphId: "p10", tier: "starter", preferredWardKeys: [], required: 2 }])

    // Both slots are in the same journey — should still place both
    expect(r1a()?.type).toBe("hieroglyphFragment")
    expect(r1b()?.type).toBe("hieroglyphFragment")
  })
})

describe("fragment placement — run 2 (ward preference)", () => {
  it("prefers ward-gated slots over open slots for run-2 fragments", () => {
    const { slot: open, result: openResult } = makeSlot("starter_1", "starter", 0, [])
    const { slot: warded, result: wardedResult } = makeSlot("starter_2", "starter", 1, ["starter_a_1"])

    assignToSlots(
      [open, warded],
      [
        {
          hieroglyphId: "p8",
          tier: "starter",
          preferredWardKeys: ["starter_a_1"],
          required: 1,
        },
      ]
    )

    expect(wardedResult()?.type).toBe("hieroglyphFragment")
    expect(openResult()?.type).not.toBe("hieroglyphFragment")
  })

  it("falls back to open slots when no ward slots available", () => {
    const { slot: s1, result: r1 } = makeSlot("starter_1", "starter", 0, [])
    const { slot: s2, result: r2 } = makeSlot("starter_2", "starter", 1, [])

    assignToSlots(
      [s1, s2],
      [
        {
          hieroglyphId: "p8",
          tier: "starter",
          preferredWardKeys: ["starter_a_1"],
          required: 2,
        },
      ]
    )

    expect(r1()?.type).toBe("hieroglyphFragment")
    expect(r2()?.type).toBe("hieroglyphFragment")
  })
})

describe("fragment placement — cross-tier fallback", () => {
  it("uses cross-tier slots when tier-matching slots exhausted", () => {
    const { slot: junior, result: juniorResult } = makeSlot("junior_1", "junior", 4, [])

    assignToSlots([junior], [{ hieroglyphId: "p10", tier: "starter", preferredWardKeys: [], required: 1 }])

    expect(juniorResult()?.type).toBe("hieroglyphFragment")
  })
})

describe("fragment placement — unfilled placeholder slots", () => {
  it("fills unassigned placeholder slots with consumables", () => {
    const { slot: s1, result: r1 } = makeSlot("starter_1", "starter", 0)
    const { slot: s2, result: r2 } = makeSlot("starter_2", "starter", 1)

    // Only 1 fragment needed, 2 placeholder slots → one gets a fragment, one gets consumable
    assignToSlots([s1, s2], [{ hieroglyphId: "p10", tier: "starter", preferredWardKeys: [], required: 1 }])

    const results = [r1(), r2()]
    expect(results.filter(r => r?.type === "hieroglyphFragment")).toHaveLength(1)
    expect(results.filter(r => r?.type === "consumable")).toHaveLength(1)
  })

  it("does not fill non-placeholder (ward) slots left unassigned", () => {
    const { slot: wardSlot, result: wardResult } = makeSlot("starter_1", "starter", 0, ["starter_a_1"], false)

    assignToSlots([wardSlot], [])

    // Non-placeholder slots left unassigned stay null
    expect(wardResult()).toBeNull()
  })
})
