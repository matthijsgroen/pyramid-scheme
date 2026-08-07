import { describe, it, expect } from "vitest"
import { MOSAIC_CURRENCIES, MOSAIC_STEPS_BY_TIER, MOSAIC_TIERS, MOSAIC_TOTAL, mosaicBucket } from "./mosaicCurrency"
import type { Slot } from "@/worldGen/slots"
import type { Tier } from "@/worldGen/types"

// What mosaic is supposed to do: place each register's pieces into free loot slots OF THAT
// REGISTER'S DIFFICULTY, preferring slots the DSL tagged for that pool but happy with any node of
// the right tier.

const slot = (tier: Tier, preference?: string): Slot => ({
  ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
  journeyId: "j",
  tier,
  wardKeys: [],
  isPlaceholder: true,
  kind: "end",
  rewardPriority: 100,
  preference,
  assign: () => {},
})

const currencyFor = (tier: (typeof MOSAIC_TIERS)[number]) =>
  MOSAIC_CURRENCIES.find(c => c.bucket === mosaicBucket(tier))!

describe("mosaic currencies", () => {
  it("has one pool per register, and their totals sum to the whole window", () => {
    expect(MOSAIC_CURRENCIES.map(c => c.bucket)).toEqual(MOSAIC_TIERS.map(mosaicBucket))
    const summed = MOSAIC_CURRENCIES.reduce((sum, c) => sum + c.totalRequired({}), 0)
    expect(summed).toBe(MOSAIC_TOTAL)
  })

  it("mints a piece tagged with its own register", () => {
    expect(currencyFor("expert").toReward()).toEqual({ type: "mosaicPiece", tier: "expert" })
    expect(currencyFor("expert").totalRequired({})).toBe(MOSAIC_STEPS_BY_TIER.expert)
  })

  it("only takes loot nodes of its own difficulty", () => {
    const junior = currencyFor("junior")
    expect(junior.eligible?.(slot("junior"))).toBe(true)
    expect(junior.eligible?.(slot("wizard"))).toBe(false)
  })

  it("ranks slots tagged for its own pool first, rest in natural order", () => {
    const starter = currencyFor("starter")
    const untagged1 = slot("starter")
    const tagged = slot("starter", mosaicBucket("starter"))
    const otherPool = slot("starter", mosaicBucket("wizard"))
    const ranked = starter.rank([untagged1, tagged, otherPool])
    expect(ranked[0]).toBe(tagged)
    expect(ranked.slice(1)).toEqual([untagged1, otherPool])
  })
})
