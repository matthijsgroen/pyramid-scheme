import { describe, expect, it } from "vitest"
import type { SiteConfig, TreasureReward } from "./types"
import type { ReachabilitySupport } from "./reachability"
import { placeFragments, type CurrencyDistribution } from "./placeFragments"
import { PYRAMID_JOURNEYS } from "./data"

// placeFragments reads each journey's tier from the world's journey list, so the made-up world
// borrows one starter and one junior journey id; its sites and gates are all made up here.
const journeyOfTier = (tier: string): string => {
  const journey = PYRAMID_JOURNEYS.find(j => j.tier === tier)
  if (!journey) throw new Error(`no ${tier} journey to borrow`)
  return journey.id
}

const plainSite = (): SiteConfig => [
  { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
]

const world = (): Record<string, SiteConfig[]> => ({
  [journeyOfTier("starter")]: [plainSite()],
  [journeyOfTier("junior")]: [plainSite()],
})

describe("placeFragments winnability guard", () => {
  it("throws naming a tier whose only group's bucket no one places", () => {
    const support: ReachabilitySupport = {
      tierUnlockGroups: tier => (tier === "junior" ? [["made-up-unlock"]] : []),
    }
    expect(() => placeFragments(world(), [], undefined, [], [], undefined, 0, support)).toThrow(
      /tier\(s\) still locked.*junior.*made-up-unlock/
    )
  })

  it("passes the same world once nothing gates the tier", () => {
    expect(() => placeFragments(world(), [], undefined, [], [], undefined, 0, {})).not.toThrow()
  })
})

describe("placeFragments locked-tier guard", () => {
  it("refuses a journey in the world that no journey list gives a tier", () => {
    expect(() =>
      placeFragments({ ...world(), "made-up-journey": [plainSite()] }, [], undefined, [], [], undefined, 0, {})
    ).toThrow(/made-up-journey.*no tier/)
  })
})

describe("placeFragments gate walk", () => {
  const stocked: TreasureReward = { type: "made-up-stock" }
  const found: TreasureReward = { type: "made-up-find" }
  const lootedWorld = (): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [
      [
        {
          ...plainSite()[0],
          rewards: [found],
          sideSections: [
            { pathPuzzles: 0, difficulty: "starter", end: "treasure", encounter: "fez-shop", rewards: [stocked] },
          ],
        },
      ],
    ],
    [journeyOfTier("junior")]: [plainSite()],
  })

  it("hands back a walk whose open world reaches every reward the permissive walk lists", () => {
    const { reachableRewards, walk } = placeFragments(lootedWorld(), [], undefined, [], [], undefined, 0, {})
    expect(reachableRewards).toEqual(expect.arrayContaining([stocked, found]))
    expect([...walk().rewards].sort(byType)).toEqual([...reachableRewards].sort(byType))
    expect(walk().enteredJourneys).toEqual(new Set([journeyOfTier("starter"), journeyOfTier("junior")]))
  })
})

describe("placeFragments slot reach", () => {
  // A made-up world: the starter journey's main path runs through a room that needs the made-up glyph,
  // and ends in a slot behind it; the junior journey's main end is a slot nothing stands before.
  const glyph = "made-up:glyph"
  const starter = journeyOfTier("starter")
  const piece: TreasureReward = { type: "made-up-piece" }
  const slotWorld = (): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [
      [
        {
          pathPuzzles: 2,
          difficulty: "starter",
          end: "treasure",
          exitOrStaircase: "exit",
          encountersByIndex: { 1: "made-up-lock" },
          mainEndReward: { type: "fragmentSlot" },
          sideSections: [],
        },
      ],
    ],
    [journeyOfTier("junior")]: [[{ ...plainSite()[0], mainEndReward: { type: "fragmentSlot" } }]],
  })
  // Ranks the starter slot first, so only the reach check keeps the piece out of the room behind its own lock.
  const currency: CurrencyDistribution = {
    ownsBucket: bucket => bucket === glyph,
    toReward: () => piece,
    thresholdFor: () => 1,
    bucketForReward: reward => (reward.type === piece.type ? glyph : undefined),
    demandFor: () => ({
      bucket: glyph,
      instanceId: glyph,
      tier: "starter",
      preferredWardKeys: [],
      required: 1,
      totalRequired: 1,
    }),
    rank: candidates =>
      [...candidates].sort((a, b) => Number(b.journeyId === starter) - Number(a.journeyId === starter)),
  }
  const requirements = (familyId: string) => (familyId === "made-up-lock" ? [glyph] : undefined)

  it("never places a piece in a room that stands behind the lock the piece opens", () => {
    const configs = slotWorld()
    placeFragments(configs, [currency], requirements, [], [], undefined, 0, {})
    expect(configs[journeyOfTier("junior")][0][0].mainEndReward).toEqual(piece)
    expect(configs[journeyOfTier("starter")][0][0].mainEndReward).toBeUndefined()
  })
})

const byType = (a: TreasureReward, b: TreasureReward) => a.type.localeCompare(b.type)
