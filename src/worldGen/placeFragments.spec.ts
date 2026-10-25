import { describe, expect, it } from "vitest"
import type { SideSection, SiteConfig, TreasureReward } from "./types"
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

describe("placeFragments dynamic loot order", () => {
  // The made-up world's one loot slot: the starter floor's only puzzle room.
  const oneSlotWorld = (): Record<string, SiteConfig[]> => ({
    [journeyOfTier("starter")]: [[{ ...plainSite()[0], rewards: [undefined] }]],
    [journeyOfTier("junior")]: [plainSite()],
  })
  const takesOne = (type: string, over: Partial<Distribution> = {}): Distribution => ({
    id: `made-up-${type}`,
    footprint: () => ({ min: 0, max: 1 }),
    eligible: slot => slot.kind === "puzzle",
    fill: slots => slots.forEach(slot => slot.assign({ type })),
    ...over,
  })

  it("a distribution marked last fills after one registered after it", () => {
    const configs = oneSlotWorld()
    const last = takesOne("made-up-last", { fillsLast: true })
    placeFragments(configs, [], undefined, [], [last, takesOne("made-up-other")], undefined, 0, {})
    expect(configs[journeyOfTier("starter")][0][0].rewards).toEqual([{ type: "made-up-other" }])
  })

  it("a distribution marked last finds a fresh placeholder in each slot, a puzzle slot's included, and a walk listing it", () => {
    const authored: TreasureReward = { type: "fragmentSlot" }
    const configs: Record<string, SiteConfig[]> = {
      [journeyOfTier("starter")]: [[{ ...plainSite()[0], rewards: [undefined], mainEndReward: authored }]],
      [journeyOfTier("junior")]: [plainSite()],
    }
    const seen: { kind: string; fresh: boolean; listed: boolean; inConfig: boolean }[] = []
    const last: Distribution = {
      id: "made-up-last",
      footprint: () => ({ min: 0, max: 2 }),
      fillsLast: true,
      fill: (slots, world, ctx) => {
        const floor = world[journeyOfTier("starter")][0][0]
        const listed = new Set(ctx!.walk.holding(new Set()).rewards)
        for (const slot of slots)
          seen.push({
            kind: slot.kind,
            fresh: slot.sentinel !== undefined && slot.sentinel !== authored,
            listed: listed.has(slot.sentinel!),
            inConfig: floor.rewards![0] === slot.sentinel || floor.mainEndReward === slot.sentinel,
          })
        for (const slot of slots) slot.assign(undefined)
      },
    }
    placeFragments(configs, [], undefined, [], [last], undefined, 0, {})
    expect(seen.sort((a, b) => a.kind.localeCompare(b.kind))).toEqual([
      { kind: "end", fresh: true, listed: true, inConfig: true },
      { kind: "puzzle", fresh: true, listed: true, inConfig: true },
    ])
  })

  it("unmarked distributions keep their registration order", () => {
    const configs = oneSlotWorld()
    placeFragments(configs, [], undefined, [], [takesOne("made-up-a"), takesOne("made-up-b")], undefined, 0, {})
    expect(configs[journeyOfTier("starter")][0][0].rewards).toEqual([{ type: "made-up-a" }])
  })
})

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

  // The same world, with the starter slot in a side section whose own first room needs the glyph, or in a shop the
  // glyph's gate shuts. A ward key on the starter main end opens the tomb-key gate of the open-gate case.
  const ward: TreasureReward = { type: "tombKey", keyId: "made-up-ward" }
  const wardSupport: ReachabilitySupport = {
    bucketForReward: reward => (reward.type === "tombKey" ? (reward.keyId as string) : undefined),
  }
  const sectionWorld = (section: SideSection): Record<string, SiteConfig[]> => ({
    [starter]: [[{ ...plainSite()[0], mainEndReward: ward, sideSections: [section] }]],
    [journeyOfTier("junior")]: [[{ ...plainSite()[0], mainEndReward: { type: "fragmentSlot" } }]],
  })
  const lockedChain = {
    pathPuzzles: 1,
    difficulty: "starter" as const,
    end: "treasure" as const,
    encountersByIndex: { 0: "made-up-lock" },
  }

  it.each<[string, SideSection, (section: SideSection) => TreasureReward | undefined]>([
    [
      "a side section's end behind its own glyph room",
      { ...lockedChain, endReward: { type: "fragmentSlot" } },
      section => section.endReward,
    ],
    [
      "an open tomb-key gate's end behind its own glyph room",
      { ...lockedChain, gate: { type: "tomb-key", wardKeyId: "made-up-ward" } },
      section => section.endReward,
    ],
    [
      "a shop's stock placeholder behind a gate on the glyph",
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        encounter: "fez-shop",
        gate: { type: "tomb-key", wardKeyId: glyph },
        rewards: [{ type: "fragmentSlot" }],
      },
      section => section.rewards?.[0],
    ],
  ])("%s is skipped for another journey's end", (_, section, held) => {
    const configs = sectionWorld(section)
    placeFragments(configs, [currency], requirements, [], [], undefined, 0, wardSupport)
    expect(configs[journeyOfTier("junior")][0][0].mainEndReward).toEqual(piece)
    expect(held(configs[starter][0][0].sideSections[0])).toBeUndefined()
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

describe("placeFragments at the frontier", () => {
  // A made-up currency of one-instance keys: each key's only home is a slot tagged with its own bucket.
  const keyOf = (bucket: string): TreasureReward => ({ type: "made-up-key", bucket })
  const keys: CurrencyDistribution = {
    ownsBucket: bucket => bucket.startsWith("made-up-key:"),
    toReward: bucket => keyOf(bucket),
    demandFor: bucket => ({
      bucket,
      instanceId: bucket,
      tier: "starter",
      preferredWardKeys: [],
      required: 1,
      totalRequired: 1,
    }),
    rank: (candidates, demand) => candidates.filter(slot => slot.preference === demand.bucket),
  }
  const support: ReachabilitySupport = {
    bucketForReward: reward => (reward.type === "made-up-key" ? (reward.bucket as string) : undefined),
    tierUnlockGroups: tier => (tier === "junior" ? [["made-up-key:junior"]] : []),
  }
  const tagged = (bucket: string): SiteConfig => [
    { ...plainSite()[0], mainEndReward: { type: "fragmentSlot", prefers: bucket } },
  ]

  it("a locked tier's bucket a currency owns is placed once every tier below it is open", () => {
    const configs = {
      [journeyOfTier("starter")]: [tagged("made-up-key:junior")],
      [journeyOfTier("junior")]: [plainSite()],
    }
    const { walk } = placeFragments(configs, [keys], undefined, [], [], undefined, 0, support)
    expect(configs[journeyOfTier("starter")][0][0].mainEndReward).toEqual(keyOf("made-up-key:junior"))
    expect(walk().unlockedTiers).toContain("junior")
  })

  it("a bucket whose slot is not reached yet waits for the placement that reaches it", () => {
    // The junior tier opens on a key whose slot stands behind a gate on another key, discovered after it.
    const configs = {
      [journeyOfTier("junior")]: [plainSite()],
      [journeyOfTier("starter")]: [
        [
          {
            ...tagged("made-up-key:gate")[0],
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "starter" as const,
                end: "treasure" as const,
                gate: { type: "tomb-key" as const, wardKeyId: "made-up-key:gate" },
                endReward: { type: "fragmentSlot" as const, prefers: "made-up-key:junior" },
              },
            ],
          },
        ],
      ],
    }
    const gated: ReachabilitySupport = {
      ...support,
      journeyEntryLocks: journeyId =>
        journeyId === journeyOfTier("junior") ? [{ bucket: "made-up-key:junior", threshold: 1 }] : [],
      tierUnlockGroups: () => [],
    }
    const { walk } = placeFragments(configs, [keys], undefined, [], [], undefined, 0, gated)
    expect(configs[journeyOfTier("starter")][0][0].sideSections[0].endReward).toEqual(keyOf("made-up-key:junior"))
    expect(walk().enteredJourneys).toContain(journeyOfTier("junior"))
  })

  it("every bucket still waiting is named when nothing more can be placed", () => {
    const configs = {
      [journeyOfTier("junior")]: [plainSite()],
      [journeyOfTier("starter")]: [plainSite()],
    }
    const twoLocks: ReachabilitySupport = {
      ...support,
      tierUnlockGroups: () => [],
      journeyEntryLocks: journeyId =>
        journeyId === journeyOfTier("junior")
          ? [
              { bucket: "made-up-key:a", threshold: 1 },
              { bucket: "made-up-key:b", threshold: 1 },
            ]
          : [],
    }
    expect(() => placeFragments(configs, [keys], undefined, [], [], undefined, 0, twoLocks)).toThrow(
      /made-up-key:a \(made-up-key:a\) unplaceable.*; placeFragments: made-up-key:b \(made-up-key:b\) unplaceable/
    )
  })

  it("a completion-pass bucket that cannot be placed is refused after the tier lock that kept it out of reach", () => {
    // The junior tier waits on a bucket no currency owns, so the completion pass is all that asks for the key.
    const configs = {
      [journeyOfTier("starter")]: [plainSite()],
      [journeyOfTier("junior")]: [tagged("made-up-key:late")],
    }
    const listed: CurrencyDistribution = { ...keys, allBuckets: () => ["made-up-key:late"] }
    const unowned: ReachabilitySupport = {
      ...support,
      tierUnlockGroups: tier => (tier === "junior" ? [["made-up-perk"]] : []),
    }
    expect(() => placeFragments(configs, [listed], undefined, [], [], undefined, 0, unowned)).toThrow(
      /^placeFragments: world not fully solvable — tier\(s\) still locked after placement: junior \(needs one of each: \[made-up-perk\]\); placeFragments: made-up-key:late \(made-up-key:late\) unplaceable — 1 instance\(s\) with no reachable slot \(no gate on it was reached; its currency lists it for the completion pass\)$/
    )
  })

  it("a bucket no placement ever reaches is refused, naming the gate it stands before", () => {
    const configs = {
      [journeyOfTier("starter")]: [plainSite()],
      [journeyOfTier("junior")]: [tagged("made-up-key:junior")],
    }
    expect(() => placeFragments(configs, [keys], undefined, [], [], undefined, 0, support)).toThrow(
      /made-up-key:junior \(made-up-key:junior\) unplaceable — 1 instance\(s\) with no reachable slot before its gate \(tier junior\)/
    )
  })
})
