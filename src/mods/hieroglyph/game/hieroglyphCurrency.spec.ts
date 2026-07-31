import { describe, it, expect } from "vitest"
import { HIEROGLYPH_CURRENCY } from "./hieroglyphCurrency"
import { HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import type { Slot } from "@/worldGen/slots"
import type { CurrencyDemand } from "@/worldGen/placeFragments"
import type { SiteConfig, Tier } from "@/worldGen/types"

// What hieroglyph is supposed to do: own the `hieroglyph:*` buckets, mint fragment rewards, know
// how many of each a tableau needs (minus any already authored), and rank placement slots by
// tier / ward / preference with one-per-journey spread.

const anyId = Object.keys(HIEROGLYPH_REQUIRED)[0]

const slot = (over: Partial<Slot>): Slot => ({
  ref: { journeyId: over.journeyId ?? "j", levelIndex: 0, floorIndex: 0 },
  journeyId: "j",
  tier: "starter",
  wardKeys: [],
  isPlaceholder: true,
  kind: "end",
  rewardPriority: 100,
  assign: () => {},
  ...over,
})

describe("HIEROGLYPH_CURRENCY", () => {
  it("owns only its own buckets", () => {
    expect(HIEROGLYPH_CURRENCY.ownsBucket("hieroglyph")).toBe(true)
    expect(HIEROGLYPH_CURRENCY.ownsBucket("hieroglyph:ra")).toBe(true)
    expect(HIEROGLYPH_CURRENCY.ownsBucket("mosaicPiece")).toBe(false)
  })

  it("mints a fragment reward and maps it back to its bucket", () => {
    expect(HIEROGLYPH_CURRENCY.toReward("ra")).toEqual({ type: "hieroglyphFragment", hieroglyphId: "ra" })
    expect(HIEROGLYPH_CURRENCY.bucketForReward!({ type: "hieroglyphFragment", hieroglyphId: "ra" })).toBe(
      "hieroglyph:ra"
    )
    expect(HIEROGLYPH_CURRENCY.bucketForReward!({ type: "mosaicPiece" })).toBeUndefined()
  })

  it("demands (total required − already authored) instances of a hieroglyph", () => {
    const total = HIEROGLYPH_REQUIRED[anyId]
    // A world with one of `anyId` already baked in → demand drops by one.
    const configs: Record<string, SiteConfig[]> = {
      j: [
        [
          {
            pathPuzzles: 0,
            difficulty: "starter",
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: [],
            mainEndReward: { type: "hieroglyphFragment", hieroglyphId: anyId },
          },
        ],
      ],
    }
    const demand = HIEROGLYPH_CURRENCY.demandFor(`hieroglyph:${anyId}`, configs)
    expect(demand.totalRequired).toBe(total)
    expect(demand.required).toBe(total - 1)
  })

  it("never offers an off-tier slot, not even as a last resort", () => {
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: [],
      required: 3,
      totalRequired: 3,
    } satisfies CurrencyDemand
    const wrongTier = slot({ journeyId: "a", tier: "starter" })
    const ranked = HIEROGLYPH_CURRENCY.rank([wrongTier], demand)
    expect(ranked).toEqual([])
  })

  it("a deliberately expert-tiered slot inside a starter journey is still eligible", () => {
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: [],
      required: 1,
      totalRequired: 1,
    } satisfies CurrencyDemand
    // journeyId says "starter", but the slot's OWN authored difficulty (tier) says expert — a
    // cross-tier ward pocket, which slots.ts's own tier comment says must still count.
    const crossTierSlot = slot({ journeyId: "starter_1", tier: "expert" })
    const ranked = HIEROGLYPH_CURRENCY.rank([crossTierSlot], demand)
    expect(ranked).toEqual([crossTierSlot])
  })

  it("spreads across pyramids within the tier, relaxing to a repeat pyramid before ever leaving the tier", () => {
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: [],
      required: 2,
      totalRequired: 2,
    } satisfies CurrencyDemand
    const sameJourneySecond = slot({
      journeyId: "j",
      ref: { journeyId: "j", levelIndex: 0, floorIndex: 1 },
      tier: "expert",
    })
    const otherJourney = slot({ journeyId: "k", ref: { journeyId: "k", levelIndex: 0, floorIndex: 0 }, tier: "expert" })
    const offTier = slot({ journeyId: "m", tier: "starter" })
    const ranked = HIEROGLYPH_CURRENCY.rank(
      [slot({ journeyId: "j", tier: "expert" }), sameJourneySecond, otherJourney, offTier],
      demand
    )
    expect(ranked).not.toContain(offTier)
    expect(ranked.map(s => s.journeyId).slice(0, 2)).toEqual(expect.arrayContaining(["j", "k"]))
  })

  it("takes at most one ward-matched slot per distinct preferred key, relaxing to plain slots for the rest", () => {
    // required: 2 — matching how placeFragments actually consumes the ranked list (take the
    // first `required` entries, in order; see placeFragments.ts's `for (const slot of ranked)`).
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: ["expert_a_1"],
      required: 2,
      totalRequired: 2,
    } satisfies CurrencyDemand
    const wardA = slot({ journeyId: "a", tier: "expert", wardKeys: ["expert_a_1"] })
    const wardB = slot({ journeyId: "b", tier: "expert", wardKeys: ["expert_a_1"] })
    const plain = slot({ journeyId: "c", tier: "expert" })
    const ranked = HIEROGLYPH_CURRENCY.rank([wardA, wardB, plain], demand)
    const wouldBeConsumed = ranked.slice(0, demand.required)
    const wardMatchedCount = wouldBeConsumed.filter(s => s.wardKeys.includes("expert_a_1")).length
    expect(wardMatchedCount).toBe(1)
    // The un-taken ward slot still appears in the relaxed tail — never dropped outright, just
    // deprioritized behind the plain slot.
    expect(ranked).toHaveLength(3)
  })

  it("a symbol needed deep in its tomb's tableau chain can hold back one fragment per distinct key", () => {
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: ["expert_a_1", "expert_a_2"],
      required: 2,
      totalRequired: 2,
    } satisfies CurrencyDemand
    const wardA = slot({ journeyId: "a", tier: "expert", wardKeys: ["expert_a_1"] })
    const wardB = slot({ journeyId: "b", tier: "expert", wardKeys: ["expert_a_2"] })
    const ranked = HIEROGLYPH_CURRENCY.rank([wardA, wardB], demand)
    expect(ranked).toEqual(expect.arrayContaining([wardA, wardB]))
  })

  it("preferredWardKeysFor (via demandFor) finds the tomb a symbol is actually first needed in, including a secondary tomb", () => {
    // p10 is a starter symbol first needed on the primary tomb's very first tableau run — no
    // ward preference (it must stay pre-tomb reachable to open that room in the first place).
    const p10Demand = HIEROGLYPH_CURRENCY.demandFor("hieroglyph:p10", {})
    expect(p10Demand.preferredWardKeys).toEqual([])
    // a7 is an expert symbol only ever needed in expert's SECONDARY tomb (expert_treasure_tomb_b)
    // — its preference must point at that tomb's own keys, not the (irrelevant) primary tomb's.
    const a7Demand = HIEROGLYPH_CURRENCY.demandFor("hieroglyph:a7", {})
    expect(a7Demand.preferredWardKeys.length).toBeGreaterThan(0)
    expect(a7Demand.preferredWardKeys.every(k => k.startsWith("expert_b_"))).toBe(true)
  })
})
