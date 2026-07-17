import { describe, it, expect } from "vitest"
import { MOSAIC_CURRENCY, MOSAIC_TOTAL, MOSAIC_BUCKET } from "./mosaicCurrency"
import type { Slot } from "@/worldGen/slots"

// What mosaic is supposed to do: place MOSAIC_TOTAL cosmetic pieces into whatever loot slots are
// free, preferring slots the DSL tagged `prefers: mosaicPiece` but happy anywhere (soft tag).

const slot = (preference?: string): Slot => ({
  ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
  journeyId: "j",
  tier: "starter",
  wardKeys: [],
  isPlaceholder: true,
  kind: "end",
  rewardPriority: 100,
  preference,
  assign: () => {},
})

describe("MOSAIC_CURRENCY", () => {
  it("mints a mosaicPiece reward and wants MOSAIC_TOTAL of them", () => {
    expect(MOSAIC_CURRENCY.toReward()).toEqual({ type: "mosaicPiece" })
    expect(MOSAIC_CURRENCY.totalRequired({})).toBe(MOSAIC_TOTAL)
  })

  it("ranks `prefers: mosaicPiece` slots first, rest in natural order", () => {
    const untagged1 = slot()
    const tagged = slot(MOSAIC_BUCKET)
    const untagged2 = slot()
    const ranked = MOSAIC_CURRENCY.rank([untagged1, tagged, untagged2])
    expect(ranked[0]).toBe(tagged)
    expect(ranked.slice(1)).toEqual([untagged1, untagged2])
  })
})
