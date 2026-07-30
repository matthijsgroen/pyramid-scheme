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
    // starter_1 is a real authored pyramid journey — collectSlots gates on its emitFragmentSlots
    // capability, so a made-up journeyId would be skipped. Tier comes from the floor difficulty.
    const slots = collectSlots({ starter_1: [siteWithFragmentSlot()] })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      ref: { journeyId: "starter_1", levelIndex: 0, floorIndex: 0 },
      tier: "starter",
      wardKeys: [],
      isPlaceholder: true,
    })
  })

  it("tiers a slot by its own section difficulty, not the journey's tier", () => {
    // A wizard-difficulty ward wing authored inside a starter journey: its loot must tier as
    // wizard (Part B — the difficulty marker drives placement, not the containing journey).
    const site: SiteConfig = [
      {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 0, difficulty: "wizard", end: "treasure", endReward: { type: "fragmentSlot" } }],
      },
    ]
    const slots = collectSlots({ starter_1: [site] })
    expect(slots).toHaveLength(1)
    expect(slots[0].tier).toBe("wizard")
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

  it("never surfaces an open tomb-key gate whose end is a stairhead, not a treasure", () => {
    // buildSite.ts's wireSideSectionStaircases: a section whose `end` is a stairhead is a pure
    // floor-to-floor connector ("the treasure IS the key", pyramid-interior-design.md §8) — and
    // siteAssembler.ts's own room-building never attaches a reward to that stairhead cell. If a
    // currency filled this slot anyway, the reward would be silently unreachable in play.
    const siteWithStairheadGate: SiteConfig = [
      {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          {
            pathPuzzles: 0,
            difficulty: "starter",
            end: { stairId: "j:0:floor0:side0" },
            gate: { type: "tomb-key", wardKeyId: "some-key" },
          },
        ],
      },
      { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
    ]
    const slots = collectSlots({ starter_1: [siteWithStairheadGate] })
    expect(slots).toHaveLength(0)
  })
})
