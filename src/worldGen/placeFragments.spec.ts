import { describe, expect, it } from "vitest"
import type { SiteConfig, TreasureReward } from "./types"
import type { ReachabilitySupport } from "./reachability"
import { placeFragments } from "./placeFragments"
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

const byType = (a: TreasureReward, b: TreasureReward) => a.type.localeCompare(b.type)
