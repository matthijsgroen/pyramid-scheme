import { describe, it, expect } from "vitest"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { Treasure } from "@/data/treasures"

const makeJourney = (levelNr = 1, seed = 12345): CombinedJourneyState =>
  ({
    journeyId: "starter_pyramid_1",
    levelNr,
    completionCount: 0,
    foundMapPiece: false,
    inProgress: true,
    active: true,
    randomSeed: seed,
    progressPercentage: 0,
    journey: {
      id: "starter_pyramid_1",
      type: "pyramid",
      difficulty: "starter",
      levelCount: 3,
    },
  }) as unknown as CombinedJourneyState

const makeTreasure = (id: string, effects: Treasure["effects"]): Treasure => ({
  id,
  name: "Test Treasure",
  symbol: "𓀀",
  description: "test",
  effects,
})

describe("moreLootChance treasure effects", () => {
  it("no owned treasures → no bonus loot from moreLootChance", () => {
    // base chance 0 so only moreLootChance could produce items
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      []
    )
    expect(result.shouldAwardInventoryItem).toBe(false)
    expect(result.itemIds).toHaveLength(0)
  })

  it("100% moreLootChance always awards a bonus item", () => {
    const treasure = makeTreasure("t_test", { moreLootChance: { chance: 1.0, tier: "stone" } })
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0, // base chance 0 so only bonus items
      1,
      3,
      [treasure]
    )
    expect(result.shouldAwardInventoryItem).toBe(true)
    expect(result.itemIds.length).toBeGreaterThan(0)
  })

  it("0% moreLootChance never awards a bonus item", () => {
    const treasure = makeTreasure("t_test", { moreLootChance: { chance: 0.0, tier: "stone" } })
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      [treasure]
    )
    expect(result.shouldAwardInventoryItem).toBe(false)
    expect(result.itemIds).toHaveLength(0)
  })

  it("two 50% same-tier treasures stack to 100% and always award a bonus item", () => {
    const treasures = [
      makeTreasure("t1", { moreLootChance: { chance: 0.5, tier: "stone" } }),
      makeTreasure("t2", { moreLootChance: { chance: 0.5, tier: "stone" } }),
    ]
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      treasures
    )
    expect(result.shouldAwardInventoryItem).toBe(true)
    expect(result.itemIds.length).toBeGreaterThan(0)
  })

  it("tier-specific treasure awards item from that tier regardless of current pyramid difficulty", () => {
    // Bronze-tier treasure played on a starter (stone) pyramid
    const treasure = makeTreasure("t_test", { moreLootChance: { chance: 1.0, tier: "bronze" } })
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      [treasure]
    )
    expect(result.shouldAwardInventoryItem).toBe(true)
    expect(result.itemIds.length).toBeGreaterThan(0)
  })

  it("tier-less moreLootChance resolves to current pyramid difficulty tier", () => {
    const treasure = makeTreasure("t_test", { moreLootChance: { chance: 1.0 } }) // no tier = adapts
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      [treasure]
    )
    expect(result.shouldAwardInventoryItem).toBe(true)
    expect(result.itemIds.length).toBeGreaterThan(0)
  })

  it("result is deterministic for the same seed and level", () => {
    const treasure = makeTreasure("t_test", { moreLootChance: { chance: 0.5, tier: "stone" } })
    const args: Parameters<typeof determineInventoryLootForCurrentRuns> = [
      makeJourney(1, 99999),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3,
      [treasure],
    ]
    const result1 = determineInventoryLootForCurrentRuns(...args)
    const result2 = determineInventoryLootForCurrentRuns(...args)
    expect(result1.itemIds).toEqual(result2.itemIds)
    expect(result1.shouldAwardInventoryItem).toBe(result2.shouldAwardInventoryItem)
  })
})

describe("higherLootChance treasure effects", () => {
  it("higherLootChance adds to base inventory chance", () => {
    const treasure = makeTreasure("t_test", { higherLootChance: 0.1 })
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0.4,
      1,
      3,
      [treasure]
    )
    // effectiveBaseChance should be 0.5 (0.4 + 0.1)
    expect(result.baseChance).toBeCloseTo(0.5)
  })

  it("multiple higherLootChance treasures stack additively", () => {
    const treasures = [makeTreasure("t1", { higherLootChance: 0.1 }), makeTreasure("t2", { higherLootChance: 0.1 })]
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0.4,
      1,
      3,
      treasures
    )
    expect(result.baseChance).toBeCloseTo(0.6)
  })
})
