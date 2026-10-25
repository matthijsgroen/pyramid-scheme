import { describe, expect, it } from "vitest"
import type { SiteConfig, TreasureReward } from "./types"
import type { ReachabilitySupport } from "./reachability"
import { mergeReachabilitySupport, placeFragments, type CurrencyDistribution } from "./placeFragments"
import type { Distribution } from "./slotAllocator"
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

describe("placeFragments behind a hidden corridor", () => {
  // The starter journey's floor 1 is entered only by a hidden stair from floor 0, so none of its slots is flagged
  // hidden, yet every one of them stands past hidden cells. The junior journey's main path ends in a lens the
  // support counts as the hidden requirement, when the world holds one.
  const lens: TreasureReward = { type: "tombKey", keyId: "lens" }
  const glyph: TreasureReward = { type: "made-up-glyph" }
  const coin: TreasureReward = { type: "made-up-coin" }
  const hiddenStairWorld = (withLens: boolean): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [
      [
        {
          ...plainSite()[0],
          sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: { stairId: "site:hidden" }, hidden: true }],
        },
        {
          ...plainSite()[0],
          entrance: { stairId: "site:hidden" },
          mainEndReward: { type: "fragmentSlot" },
          rewards: [undefined],
        },
      ],
    ],
    [journeyOfTier("junior")]: [[{ ...plainSite()[0], ...(withLens ? { mainEndReward: lens } : {}) }]],
  })
  const support: ReachabilitySupport = {
    bucketForReward: reward => (reward.type === "tombKey" ? (reward.keyId as string) : undefined),
    alsoHarvests: reward => (reward.type === "tombKey" && reward.keyId === "lens" ? ["made-up-sight"] : []),
    hiddenRequirement: () => "made-up-sight",
  }
  const glyphCurrency: CurrencyDistribution = {
    ownsBucket: bucket => bucket === "made-up-glyph",
    toReward: () => glyph,
    allBuckets: () => ["made-up-glyph"],
    demandFor: bucket => ({
      bucket,
      instanceId: "made-up-glyph",
      tier: "starter",
      preferredWardKeys: [],
      required: 1,
      totalRequired: 1,
    }),
    rank: candidates => [...candidates],
  }
  const coins: Distribution = {
    id: "made-up-coins",
    footprint: () => ({ min: 1, max: 1 }),
    eligible: slot => slot.kind === "puzzle" && slot.ref.floorIndex === 1,
    fill: slots => slots.forEach(slot => slot.assign(coin)),
  }

  // The section case: the starter journey's one floor holds a hidden side section whose own sub-section is not
  // flagged hidden, and that sub-section's end is the only slot in the world.
  const hiddenSectionWorld = (withLens: boolean): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [
      [
        {
          ...plainSite()[0],
          sideSections: [
            {
              pathPuzzles: 0,
              difficulty: "starter",
              end: "treasure",
              hidden: true,
              sideSections: [
                { pathPuzzles: 0, difficulty: "starter", end: "treasure", endReward: { type: "fragmentSlot" } },
              ],
            },
          ],
        },
      ],
    ],
    [journeyOfTier("junior")]: [[{ ...plainSite()[0], ...(withLens ? { mainEndReward: lens } : {}) }]],
  })

  it("a slot or section reached only through hidden cells (past a hidden stair, or inside a hidden section) gets no key until the detector is held", () => {
    const place = (world: Record<string, SiteConfig[]>) =>
      placeFragments(world, [glyphCurrency], undefined, [], [], undefined, 0, support)

    expect(() => place(hiddenStairWorld(false))).toThrow(/made-up-glyph.*no reachable slot/)
    const world = hiddenStairWorld(true)
    place(world)
    expect(world[journeyOfTier("starter")][0][1].mainEndReward).toEqual(glyph)

    expect(() => place(hiddenSectionWorld(false))).toThrow(/made-up-glyph.*no reachable slot/)
    // Inside a hidden section a slot is an optional pocket, so it takes no gating key even once the detector is held.
    expect(() => place(hiddenSectionWorld(true))).toThrow(/made-up-glyph.*no reachable slot/)
  })

  it("with no hidden requirement a slot past hidden cells gets no key and hidden loot is out of the strict walk", () => {
    const { hiddenRequirement: _, ...noRequirement } = support
    expect(() =>
      placeFragments(hiddenStairWorld(true), [glyphCurrency], undefined, [], [], undefined, 0, noRequirement)
    ).toThrow(/made-up-glyph.*no reachable slot/)

    const { reachableRewards, walk } = placeFragments(
      hiddenStairWorld(true),
      [],
      undefined,
      [],
      [coins],
      () => 60,
      0,
      noRequirement
    )
    expect(reachableRewards).toContainEqual(coin)
    expect(walk().rewards).not.toContainEqual(coin)
    expect(walk().blocking.size).toBe(0)
  })

  it("a dynamic distribution's slot reached only through hidden cells counts as behind the detector", () => {
    const { reachableRewards, walk } = placeFragments(
      hiddenStairWorld(true),
      [],
      undefined,
      [],
      [coins],
      () => 60,
      0,
      support
    )
    expect(reachableRewards).toContainEqual(coin)
    expect(walk().rewards).toContainEqual(coin)
    expect(walk("made-up-sight").rewards).not.toContainEqual(coin)
    expect(walk("made-up-sight").blocking).toEqual(new Set(["made-up-sight"]))
  })

  it("the merged support keeps the hidden requirement", () => {
    expect(mergeReachabilitySupport([], support).hiddenRequirement?.()).toBe("made-up-sight")
  })
})

describe("placeFragments slot reach", () => {
  // A made-up world: the starter journey's main path runs through a room that needs the made-up glyph,
  // and ends in a slot behind it; the junior journey's main end is a slot nothing stands before.
  const glyph = "made-up:glyph"
  const starter = journeyOfTier("starter")
  const piece: TreasureReward = { type: "made-up-piece" }
  const slotWorld = (): Record<string, SiteConfig[]> => ({
    [starter]: [
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
    demandFor: bucket => ({
      bucket,
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

  it("a slot behind a room needing the made-up glyph is skipped for another journey's end", () => {
    const configs = slotWorld()
    placeFragments(configs, [currency], requirements, [], [], undefined, 0, {})
    expect(configs[journeyOfTier("junior")][0][0].mainEndReward).toEqual(piece)
    expect(configs[starter][0][0].mainEndReward).toBeUndefined()
  })
})

describe("placeFragments carves one-ways as the support binds them", () => {
  // A made-up floor whose one-way names no realisation: play binds only what the registry answers.
  const oneWayFloor = (seed: number): SiteConfig => [
    {
      ...plainSite()[0],
      seed,
      sideSections: [
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", label: "upper" },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", label: "lower" },
      ],
      oneWays: [{ from: "upper", to: "lower" }],
    },
  ]
  const oneWayWorld = (seed: number): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [oneWayFloor(seed)],
    [journeyOfTier("junior")]: [plainSite()],
  })
  const bindsNone: ReachabilitySupport = { resolveOneWay: () => undefined }
  const bindsRope: ReachabilitySupport = {
    resolveOneWay: () => ({ id: "made-up-rope", ownerMod: "made-up", prompt: "made-up.prompt" }),
  }
  const outcome = (seed: number, support: ReachabilitySupport): string => {
    try {
      placeFragments(oneWayWorld(seed), [], undefined, [], [], undefined, 0, support)
      return "walked"
    } catch (error) {
      return String(error)
    }
  }
  const SEEDS = Array.from({ length: 30 }, (_, n) => n + 1)

  it("the merged support keeps the one-way, region-barrier and passage resolvers", () => {
    const resolveOneWay = () => undefined
    const resolveRegionBarrier = () => undefined
    const resolvePassage = () => undefined
    const merged = mergeReachabilitySupport([], { resolveOneWay, resolveRegionBarrier, resolvePassage })
    expect(merged.resolveOneWay).toBe(resolveOneWay)
    expect(merged.resolveRegionBarrier).toBe(resolveRegionBarrier)
    expect(merged.resolvePassage).toBe(resolvePassage)
  })

  it("a one-way door is walked as the support resolves it", () => {
    // Bound to nothing, every carve is refused for the one-way; bound to the made-up rope, the floor is walked.
    expect(SEEDS.map(seed => outcome(seed, bindsNone)).every(o => /oneWayRealisationRefused/.test(o))).toBe(true)
    expect(SEEDS.map(seed => outcome(seed, bindsRope))).toContain("walked")
    expect(SEEDS.map(seed => outcome(seed, bindsRope)).filter(o => /oneWayRealisationRefused/.test(o))).toEqual([])
  })
})
