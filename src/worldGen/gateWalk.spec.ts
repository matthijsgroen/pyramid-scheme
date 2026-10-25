import { describe, expect, it } from "vitest"
import type { SiteConfig, TreasureReward } from "./types"
import type { ReachabilitySupport } from "./reachability"
import { makeGateWalk } from "./gateWalk"

// A made-up world: a starter journey whose main path ends in the junior tier's ladder key, whose shop sells
// the key the junior journey's entrance needs, and whose side door opens on the ladder key itself.
const ladder: TreasureReward = { type: "tombKey", keyId: "ladder" }
const shopKey: TreasureReward = { type: "tombKey", keyId: "shop-key" }
const firstLoot: TreasureReward = { type: "mosaicPiece", tier: "starter" }
const behindLadderDoor: TreasureReward = { type: "mosaicPiece", tier: "expert" }
const secondLoot: TreasureReward = { type: "mosaicPiece", tier: "junior" }

const configs = (): Record<string, SiteConfig[]> => ({
  first: [
    [
      {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        mainEndReward: ladder,
        rewards: [firstLoot],
        sideSections: [
          { pathPuzzles: 0, difficulty: "starter", end: "treasure", encounter: "fez-shop", rewards: [shopKey] },
          {
            pathPuzzles: 0,
            difficulty: "starter",
            end: "treasure",
            endReward: behindLadderDoor,
            gate: { type: "tomb-key", wardKeyId: "ladder" },
          },
        ],
      },
    ],
  ],
  second: [
    [
      {
        pathPuzzles: 1,
        difficulty: "junior",
        end: "treasure",
        exitOrStaircase: "exit",
        mainEndReward: secondLoot,
        sideSections: [],
      },
    ],
  ],
})

const support: ReachabilitySupport = {
  bucketForReward: reward => (reward.type === "tombKey" ? (reward.keyId as string) : undefined),
  tierUnlockGroups: tier => (tier === "junior" ? [["ladder"]] : []),
  journeyEntryLocks: journeyId => (journeyId === "second" ? [{ bucket: "shop-key", threshold: 1 }] : []),
}

const gateWalk = () =>
  makeGateWalk({
    configs: configs(),
    journeyMeta: { first: { tier: "starter" }, second: { tier: "junior" } },
    support,
  })

describe(makeGateWalk, () => {
  it("with nothing withheld reaches both tiers and journeys and lists every reward in them", () => {
    const result = gateWalk()()
    expect(result.unlockedTiers).toContain("starter")
    expect(result.unlockedTiers).toContain("junior")
    expect(result.enteredJourneys).toEqual(new Set(["first", "second"]))
    expect(result.rewards).toEqual(expect.arrayContaining([ladder, shopKey, firstLoot, behindLadderDoor, secondLoot]))
    expect(result.blocking.size).toBe(0)
  })

  it("withholding the tier's bucket leaves that tier locked and its rewards out, the first journey's in", () => {
    const walk = gateWalk()
    walk()
    const result = walk("ladder")
    expect(result.unlockedTiers).not.toContain("junior")
    expect(result.enteredJourneys).toEqual(new Set(["first"]))
    expect(result.rewards).toEqual(expect.arrayContaining([ladder, shopKey, firstLoot]))
    expect(result.rewards).not.toContainEqual(secondLoot)
  })

  it("never holds a withheld key standing in reach, not even for a door on its own floor", () => {
    const result = gateWalk()("ladder")
    expect(result.rewards).toContainEqual(ladder)
    expect(result.rewards).not.toContainEqual(behindLadderDoor)
  })

  it("holds a key sold in a shop once the shop's room is reached, and blocks on it when withheld", () => {
    const walk = gateWalk()
    expect(walk().enteredJourneys).toContain("second")
    const without = walk("shop-key")
    expect(without.enteredJourneys).not.toContain("second")
    expect(without.blocking).toEqual(new Set(["shop-key"]))
    expect(without.rewards).toContainEqual(shopKey)
  })

  it("returns the same result object for the same withheld fact", () => {
    const walk = gateWalk()
    expect(walk("ladder")).toBe(walk("ladder"))
    expect(walk()).toBe(walk())
    expect(walk("ladder")).not.toBe(walk())
  })
})

describe("GateWalk.holding", () => {
  it("holds a shop's key only once it is bought, and lists the shop's stock apart from the rooms' rewards", () => {
    const walk = gateWalk()
    const empty = walk.holding(new Set())
    expect(empty.enteredJourneys).toEqual(new Set(["first"]))
    expect(empty.stock).toEqual([shopKey])
    expect(empty.rewards).not.toContainEqual(shopKey)
    expect(empty.rewards).toEqual(expect.arrayContaining([ladder, firstLoot, behindLadderDoor]))

    const bought = walk.holding(new Set([shopKey]))
    expect(bought.enteredJourneys).toEqual(new Set(["first", "second"]))
    expect(bought.rewards).toContainEqual(secondLoot)
    expect(bought.stock).toEqual([shopKey])
  })

  it("never holds a piece equal to a bought one but not the same piece", () => {
    const walk = gateWalk()
    expect(walk.holding(new Set([{ ...shopKey }])).enteredJourneys).not.toContain("second")
  })

  it("returns the same result for the same bought pieces, however the set is made", () => {
    const walk = gateWalk()
    const nothing = walk.holding(new Set())
    expect(walk.holding(new Set())).toBe(nothing)
    const first = walk.holding(new Set([shopKey]))
    expect(walk.holding(new Set([shopKey]))).toBe(first)
  })
})

describe("GateWalk.isKey", () => {
  it("is a key when a lock of the world names its bucket: a journey's entry lock or a tier's group", () => {
    const walk = gateWalk()
    expect(walk.isKey(shopKey)).toBe(true)
    expect(walk.isKey(ladder)).toBe(true)
    expect(walk.isKey(firstLoot)).toBe(false)
  })
})

describe("makeGateWalk on a hidden section", () => {
  // A made-up world: one journey's hidden side section holds a reward, and another journey's main path ends in
  // a treasure the support counts as the hidden requirement.
  const hiddenLoot: TreasureReward = { type: "mosaicPiece", tier: "starter" }
  const lens: TreasureReward = { type: "tombKey", keyId: "lens" }
  const hiddenWorld = (): Record<string, SiteConfig[]> => ({
    near: [
      [
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          exitOrStaircase: "exit",
          sideSections: [
            { pathPuzzles: 0, difficulty: "starter", end: "treasure", hidden: true, endReward: hiddenLoot },
          ],
        },
      ],
    ],
    far: [
      [
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          exitOrStaircase: "exit",
          mainEndReward: lens,
          sideSections: [],
        },
      ],
    ],
  })
  const hiddenSupport: ReachabilitySupport = {
    bucketForReward: reward => (reward.type === "tombKey" ? (reward.keyId as string) : undefined),
    alsoHarvests: reward => (reward.type === "tombKey" && reward.keyId === "lens" ? ["made-up-sight"] : []),
    hiddenRequirement: () => "made-up-sight",
  }
  const hiddenWalk = () =>
    makeGateWalk({
      configs: hiddenWorld(),
      journeyMeta: { near: { tier: "starter" }, far: { tier: "starter" } },
      support: hiddenSupport,
    })

  it("a reward in a hidden section is out of the ground until the detector fact is held, and in once a reached treasure grants it", () => {
    const walk = hiddenWalk()
    const without = walk("made-up-sight")
    expect(without.rewards).toContainEqual(lens)
    expect(without.rewards).not.toContainEqual(hiddenLoot)
    expect(without.blocking).toEqual(new Set(["made-up-sight"]))

    const open = walk()
    expect(open.rewards).toContainEqual(hiddenLoot)
    expect(open.blocking.size).toBe(0)
  })
})
