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

  it("ranks a tier-matching slot above a non-matching one", () => {
    const demand = {
      bucket: "hieroglyph:x",
      instanceId: "x",
      tier: "expert" as Tier,
      preferredWardKeys: [],
      required: 1,
      totalRequired: 1,
    } satisfies CurrencyDemand
    const wrongTier = slot({ journeyId: "a", tier: "starter" })
    const rightTier = slot({ journeyId: "b", tier: "expert" })
    const ranked = HIEROGLYPH_CURRENCY.rank([wrongTier, rightTier], demand)
    expect(ranked[0]).toBe(rightTier)
  })
})
