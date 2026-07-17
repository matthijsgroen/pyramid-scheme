import { describe, it, expect } from "vitest"
import type { Slot } from "@/worldGen/slots"
import { MAP_PIECE_CURRENCY } from "./mapPieceCurrency"

// A minimal end slot for the ranker: only the fields rank() reads matter.
const slot = (over: Partial<Slot>): Slot => ({
  ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
  journeyId: over.journeyId ?? "j",
  tier: "wizard",
  wardKeys: [],
  isPlaceholder: true,
  kind: "end",
  rewardPriority: 100,
  assign: () => {},
  ...over,
})

describe("MAP_PIECE_CURRENCY.rank — shop stock move", () => {
  const demand = MAP_PIECE_CURRENCY.demandFor("mapPiece:wizard_treasure_tomb_c", {})

  it("ranks a shop slot tagged for this tomb ahead of pyramid branch slots", () => {
    // The regression this guards: without a shop boost, both pyramid slots win the two instances
    // and the shop sentinel is left unfilled (trap backfills a consumable), so the authored map-piece
    // sale silently vanishes. The shop slot must sort first so one instance MOVES into the shop.
    const pyramidA = slot({ journeyId: "pyr_a", preference: "mapPiece:wizard_treasure_tomb_c", encounter: undefined })
    const pyramidB = slot({ journeyId: "pyr_b", preference: "mapPiece:wizard_treasure_tomb_c", encounter: undefined })
    const shop = slot({
      journeyId: "master_treasure_tomb_b",
      preference: "mapPiece:wizard_treasure_tomb_c",
      encounter: "fez-shop",
      tier: "master", // deliberately tier-mismatched — the shop boost must still win
    })
    const ranked = MAP_PIECE_CURRENCY.rank([pyramidA, pyramidB, shop], demand)
    expect(ranked[0].encounter).toBe("fez-shop")
  })

  it("does not boost a shop slot tagged for a different tomb", () => {
    const shopOther = slot({
      journeyId: "master_treasure_tomb_b",
      preference: "mapPiece:junior_treasure_tomb", // not this bucket
      encounter: "fez-shop",
    })
    const pyramid = slot({ journeyId: "pyr_a", preference: "mapPiece:wizard_treasure_tomb_c", encounter: undefined })
    const ranked = MAP_PIECE_CURRENCY.rank([shopOther, pyramid], demand)
    expect(ranked[0].encounter).toBeUndefined()
  })
})
