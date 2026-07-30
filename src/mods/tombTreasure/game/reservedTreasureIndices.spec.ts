import { describe, expect, it } from "vitest"
import { reservedTreasureIndices } from "./reservedTreasureIndices"

describe("reservedTreasureIndices", () => {
  it("reserves starter_treasure_tomb's every floor — all 4 now feed junior's per-journey unlock keys", () => {
    expect(reservedTreasureIndices("starter_treasure_tomb")).toEqual(expect.arrayContaining([0, 1, 2, 3]))
  })

  it("reserves expert_treasure_tomb's location-key floor (index 1) alongside its other unlock indices", () => {
    const reserved = reservedTreasureIndices("expert_treasure_tomb")
    expect(reserved).toEqual(expect.arrayContaining([0, 1, 2, 3]))
  })

  it("leaves junior_treasure_tomb's floors 5 and 6 (indices 4, 5) unreserved — genuinely spare for other content", () => {
    const reserved = reservedTreasureIndices("junior_treasure_tomb")
    expect(reserved).not.toContain(4)
    expect(reserved).not.toContain(5)
  })

  it("a tomb absent from both TOMB_PERK_IDS and TIER_UNLOCK_PERK_IDS reserves nothing", () => {
    expect(reservedTreasureIndices("not_a_real_tomb")).toEqual([])
  })
})
