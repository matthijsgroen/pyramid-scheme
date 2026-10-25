import { describe, expect, it } from "vitest"
import type { Tier } from "@/worldGen/types"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import { TOMB_PIECES_REQUIRED } from "./piecesRequired"
import { TOMB_TREASURE_REACHABILITY, detectorFactsFor } from "./reachabilitySupport"

const { journeyEntryLocks, tierUnlockGroups } = TOMB_TREASURE_REACHABILITY

describe("TOMB_TREASURE_REACHABILITY gates", () => {
  it("gives every laddered tier exactly one group: its tier-unlock treasures", () => {
    for (const [tier, perkIds] of Object.entries(TIER_UNLOCK_PERK_IDS)) {
      expect(tierUnlockGroups?.(tier as Tier)).toEqual([perkIds])
    }
  })

  it("gives the first tier no group", () => {
    expect(tierUnlockGroups?.("starter")).toEqual([])
  })

  it("gives every treasure tomb one lock on its own map pieces, and any other journey none", () => {
    for (const [tombId, threshold] of Object.entries(TOMB_PIECES_REQUIRED)) {
      expect(journeyEntryLocks?.(tombId)).toEqual([{ bucket: `mapPiece:${tombId}`, threshold }])
    }
    expect(journeyEntryLocks?.("made-up-pyramid")).toEqual([])
  })
})

describe("TOMB_TREASURE_REACHABILITY corridor detector", () => {
  it("a level-2 detection treasure grants levels 1 and 2", () => {
    expect(detectorFactsFor({ type: "detection", level: 2 })).toEqual(["detector:corridor:1", "detector:corridor:2"])
  })

  it("grants no detector fact for a perk that is not detection, or a key with no perk", () => {
    expect(detectorFactsFor({ type: "compass", level: 2 })).toEqual([])
    expect(detectorFactsFor(undefined)).toEqual([])
    expect(TOMB_TREASURE_REACHABILITY.alsoHarvests?.({ type: "tombKey", keyId: "made-up-key" })).toEqual([])
  })

  it("asks for the first detector level on a hidden section", () => {
    expect(TOMB_TREASURE_REACHABILITY.hiddenRequirement?.()).toBe("detector:corridor:1")
  })
})
