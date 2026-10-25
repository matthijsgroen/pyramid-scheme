import { describe, expect, it } from "vitest"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import type { ReachabilitySupport } from "./reachability"
import { makeGateWalk, type GateWalk } from "./gateWalk"
import { keyRewardsOf, reachableGrounds } from "./grounds"

// Made-up worlds: a starting journey whose shop sells the pieces, and journeys whose entrances ask for them.
const key = (id: string): TreasureReward => ({ type: "madeUpKey", id })
const loot = (name: string): TreasureReward => ({ type: "madeUpLoot", name })

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})
const shopFloor = (stock: TreasureReward[], overrides: Partial<FloorConfig> = {}): FloorConfig =>
  floor({
    sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", encounter: "fez-shop", rewards: stock }],
    ...overrides,
  })

const support = (entry: Record<string, { bucket: string; threshold: number }>): ReachabilitySupport => ({
  bucketForReward: reward => (reward.type === "madeUpKey" ? (reward.id as string) : undefined),
  thresholdFor: bucket => (bucket === "pair" ? 2 : undefined),
  journeyEntryLocks: journeyId => (entry[journeyId] ? [entry[journeyId]] : []),
})

const walkOf = (
  configs: Record<string, SiteConfig[]>,
  entry: Record<string, { bucket: string; threshold: number }>
): GateWalk =>
  makeGateWalk({
    configs,
    journeyMeta: Object.fromEntries(Object.keys(configs).map(id => [id, { tier: "starter" as const }])),
    support: support(entry),
  })

const twoKeys = () => {
  const [a, b] = [key("a"), key("b")]
  const walk = walkOf(
    {
      start: [[shopFloor([a, b])]],
      behindA: [[floor({ mainEndReward: loot("behind a") })]],
      behindB: [[floor({ mainEndReward: loot("behind b") })]],
    },
    { behindA: { bucket: "a", threshold: 1 }, behindB: { bucket: "b", threshold: 1 } }
  )
  return { a, b, walk }
}

const groundsOf = (result: ReturnType<typeof reachableGrounds>) => {
  if (!("grounds" in result)) throw new Error(`over the cap at ${result.overCap}`)
  return result.grounds
}

describe(reachableGrounds, () => {
  it("buying a key that opens nothing new adds no ground", () => {
    const held = key("k")
    const spare = key("k")
    const walk = walkOf(
      { start: [[shopFloor([spare], { mainEndReward: held })]], next: [[floor({ mainEndReward: loot("next") })]] },
      { next: { bucket: "k", threshold: 1 } }
    )
    const grounds = groundsOf(reachableGrounds(walk, { isKey: walk.isKey, cap: 100 }))
    expect(walk.isKey(spare)).toBe(true)
    expect(grounds).toHaveLength(1)
    expect(grounds[0].bought).toEqual([])
    expect(grounds[0].stock).toEqual([spare])
  })

  it("a key that opens nothing yet is still walked on: two pieces of one lock open it together", () => {
    const [first, second] = [key("pair"), key("pair")]
    const behind = loot("behind the pair")
    const walk = walkOf(
      { start: [[shopFloor([first, second])]], next: [[floor({ mainEndReward: behind })]] },
      { next: { bucket: "pair", threshold: 2 } }
    )
    const grounds = groundsOf(reachableGrounds(walk, { isKey: walk.isKey, cap: 100 }))
    expect(grounds.map(g => g.bought)).toEqual([[], [first, second]])
    expect(grounds[1].rewards).toContainEqual(behind)
  })

  it("two independent keys give four grounds", () => {
    const { a, b, walk } = twoKeys()
    const grounds = groundsOf(reachableGrounds(walk, { isKey: walk.isKey, cap: 100 }))
    expect(grounds.map(g => g.bought)).toEqual([[], [a], [b], [a, b]])
    expect(grounds[3].rewards).toEqual(expect.arrayContaining([loot("behind a"), loot("behind b")]))
  })

  it("only buys keys: a piece no lock names is never bought", () => {
    const { walk } = twoKeys()
    const grounds = groundsOf(reachableGrounds(walk, { isKey: () => false, cap: 100 }))
    expect(grounds.map(g => g.bought)).toEqual([[]])
  })

  it("over the cap returns the count", () => {
    const { walk } = twoKeys()
    expect(reachableGrounds(walk, { isKey: walk.isKey, cap: 2 })).toEqual({ overCap: 3 })
  })

  it("walks ≤ grounds × key pieces", () => {
    const { walk } = twoKeys()
    let walks = 0
    const counted = { holding: (bought: ReadonlySet<TreasureReward>) => (walks++, walk.holding(bought)) }
    const grounds = groundsOf(reachableGrounds(counted, { isKey: walk.isKey, cap: 100 }))
    expect(walks).toBeLessThanOrEqual(grounds.length * 2)
    expect(walks).toBe(4)
  })
})

describe(keyRewardsOf, () => {
  it("a reward is a key when some lock names its bucket", () => {
    const glyph: TreasureReward = { type: "madeUpGlyph", id: "g" }
    const mosaic: TreasureReward = { type: "madeUpMosaic", id: "m" }
    const glyphSupport: ReachabilitySupport = {
      bucketForReward: reward =>
        reward.type === "madeUpGlyph" || reward.type === "madeUpMosaic"
          ? `${reward.type}:${reward.id as string}`
          : undefined,
    }
    const configs = { start: [[floor({ pathPuzzles: 2, encountersByIndex: { 1: "made-up-tableau" } })]] }
    const isKey = keyRewardsOf(configs, glyphSupport, {
      resolveRequirements: familyId => (familyId === "made-up-tableau" ? ["madeUpGlyph:g"] : undefined),
    })
    expect(isKey(glyph)).toBe(true)
    expect(isKey(mosaic)).toBe(false)
  })

  it("a reward feeding a tier's group, an entry lock or the hidden requirement is a key", () => {
    const named: ReachabilitySupport = {
      alsoHarvests: reward => [reward.id as string],
      tierUnlockGroups: tier => (tier === "junior" ? [["tier-piece"]] : []),
      journeyEntryLocks: journeyId => (journeyId === "start" ? [{ bucket: "entry-piece", threshold: 3 }] : []),
      hiddenRequirement: () => "lens",
    }
    const isKey = keyRewardsOf({ start: [[floor()]] }, named)
    for (const id of ["tier-piece", "entry-piece", "lens"]) expect(isKey({ type: "any", id })).toBe(true)
    expect(isKey({ type: "any", id: "nothing" })).toBe(false)
  })
})
