import { describe, expect, it } from "vitest"
import type { SiteConfig } from "./types"
import { collectSlots } from "./slots"

const siteWithFragmentSlot = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    mainEndReward: { type: "fragmentSlot" },
    sideSections: [],
  },
]

const siteWithOpenWardGate = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "some-key" } },
    ],
  },
]

describe(collectSlots, () => {
  it("finds a fragmentSlot sentinel, tagged with its own floor and tier", () => {
    // starter_1 is a real authored pyramid journey (journeyStructure.ts) — collectSlots
    // looks up its tier there, so a made-up journeyId would throw.
    const slots = collectSlots({ starter_1: [siteWithFragmentSlot()] })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      ref: { journeyId: "starter_1", levelIndex: 0, floorIndex: 0 },
      tier: "starter",
      wardKeys: [],
      isPlaceholder: true,
    })
  })

  it("finds an open (unrewarded) tomb-key gate as a non-placeholder slot, tagged with its ward key", () => {
    const slots = collectSlots({ starter_1: [siteWithOpenWardGate()] })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({ wardKeys: ["some-key"], isPlaceholder: false })
  })

  it("assign() mutates the underlying config in place", () => {
    const site = siteWithFragmentSlot()
    const slots = collectSlots({ starter_1: [site] })
    slots[0].assign({ type: "hieroglyphFragment", hieroglyphId: "p10", pieceIndex: 0 })
    expect(site[0].mainEndReward).toEqual({ type: "hieroglyphFragment", hieroglyphId: "p10", pieceIndex: 0 })
  })

  it("skips journeys that don't opt into emitFragmentSlots", () => {
    const slots = collectSlots({ "not-a-real-journey": [siteWithFragmentSlot()] })
    expect(slots).toHaveLength(0)
  })
})
