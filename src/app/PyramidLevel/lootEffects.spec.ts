import { describe, it, expect } from "vitest"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import { determineExpeditionBonus } from "./expeditionBonusLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"

const makeJourney = (levelNr = 1, seed = 12345): CombinedJourneyState =>
  ({
    journeyId: "starter_pyramid_1",
    levelNr,
    completionCount: 0,
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

describe("determineInventoryLootForCurrentRuns", () => {
  it("result is deterministic for the same seed and level", () => {
    const args = [makeJourney(), "starter", {}, () => undefined, () => 0, 0, 1, 3] as const
    const result1 = determineInventoryLootForCurrentRuns(...args)
    const result2 = determineInventoryLootForCurrentRuns(...args)
    expect(result1.itemIds).toEqual(result2.itemIds)
    expect(result1.shouldAwardInventoryItem).toBe(result2.shouldAwardInventoryItem)
  })

  it("base chance 0 → no award", () => {
    const result = determineInventoryLootForCurrentRuns(
      makeJourney(),
      "starter",
      {},
      () => undefined,
      () => 0,
      0,
      1,
      3
    )
    expect(result.shouldAwardInventoryItem).toBe(false)
    expect(result.itemIds).toHaveLength(0)
  })
})

describe("determineExpeditionBonus", () => {
  it("always returns [] (expedition bonus removed with TreasureEffects)", () => {
    expect(determineExpeditionBonus(makeJourney(3))).toHaveLength(0)
    expect(determineExpeditionBonus(makeJourney(1))).toHaveLength(0)
  })
})
