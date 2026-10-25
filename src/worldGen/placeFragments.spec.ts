import { describe, expect, it } from "vitest"
import type { SiteConfig } from "./types"
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
