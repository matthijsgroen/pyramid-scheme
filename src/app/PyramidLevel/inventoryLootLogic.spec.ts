import { describe, it, expect } from "vitest"
import {
  analyzeInventoryNeeds,
  determineInventoryLoot,
} from "./inventoryLootLogic"
import type { JourneyState } from "@/app/state/useJourneys"
import type { Difficulty } from "@/data/difficultyLevels"

// Mock journey helper
function createMockJourney(
  difficulty: Difficulty,
  levelNr: number = 1,
  randomSeed: number = 12345
): JourneyState {
  return {
    journeyId: "test-journey",
    levelNr,
    randomSeed,
    canceled: false,
    completed: false,
    endTime: 0,
    startTime: Date.now(),
    journey: {
      id: "pyramid_expedition",
      name: "Pyramid Expedition",
      type: "pyramid" as const,
      difficulty,
      description: "Test journey",
      journeyLength: "medium" as const,
      levelCount: 10,
      time: "morning" as const,
      levelSettings: {
        startFloorCount: 3,
        startNumberRange: [1, 10] as [number, number],
      },
      rewards: {
        mapPiece: {
          startChance: 0.1,
          chanceIncrease: 0.05,
        },
        completed: {
          pieces: [1, 3] as [number, number],
          pieceLevels: [1, 5] as [number, number],
        },
      },
      difficultyLabel: "Test",
      lengthLabel: "Medium",
    },
  }
}

describe("analyzeInventoryNeeds", () => {
  it("identifies needed items for starter difficulty", () => {
    const journey = createMockJourney("starter")
    const inventory: Record<string, number> = {}

    const needs = analyzeInventoryNeeds(journey, inventory)

    expect(needs.length).toBeGreaterThan(0)
    // All items should be from starter level
    needs.forEach((need) => {
      expect(need.difficultyLevel).toBe("starter")
      expect(need.totalTimesNeeded).toBeGreaterThan(0)
    })
  })

  it("calculates urgency scores correctly", () => {
    const journey = createMockJourney("starter")
    const inventory: Record<string, number> = {}

    const needs = analyzeInventoryNeeds(journey, inventory)

    // Items should be sorted by urgency score (highest first)
    for (let i = 1; i < needs.length; i++) {
      expect(needs[i - 1].urgencyScore).toBeGreaterThanOrEqual(
        needs[i].urgencyScore
      )
    }
  })

  it("only includes items from current difficulty level", () => {
    const journey = createMockJourney("junior")
    const inventory: Record<string, number> = {}

    const needs = analyzeInventoryNeeds(journey, inventory)

    // All items should be from junior difficulty, even if they're used in expert+ tombs
    needs.forEach((need) => {
      expect(need.difficultyLevel).toBe("junior")
    })
  })
})

describe("determineInventoryLoot", () => {
  it("returns proper result structure", () => {
    const journey = createMockJourney("starter")
    const result = determineInventoryLoot(journey, {})

    expect(result).toHaveProperty("shouldAwardInventoryItem")
    expect(result).toHaveProperty("itemId")
    expect(result).toHaveProperty("baseChance")
    expect(result).toHaveProperty("adjustedChance")
    expect(result).toHaveProperty("needMultiplier")
  })

  it("provides deterministic results based on journey seed", () => {
    const journey1 = createMockJourney("starter", 1, 12345)
    const journey2 = createMockJourney("starter", 1, 12345)
    const inventory: Record<string, number> = {}

    const result1 = determineInventoryLoot(journey1, inventory)
    const result2 = determineInventoryLoot(journey2, inventory)

    // Same seed and level should produce same results
    expect(result1.shouldAwardInventoryItem).toBe(
      result2.shouldAwardInventoryItem
    )
    expect(result1.itemId).toBe(result2.itemId)
    expect(result1.adjustedChance).toBe(result2.adjustedChance)
  })

  it("respects base chance parameter", () => {
    const journey = createMockJourney("starter")
    const inventory: Record<string, number> = {}
    const customBaseChance = 0.5

    const result = determineInventoryLoot(journey, inventory, customBaseChance)

    expect(result.baseChance).toBe(customBaseChance)
  })

  it("caps adjusted chance at maximum", () => {
    const journey = createMockJourney("starter")
    const inventory: Record<string, number> = {}

    const result = determineInventoryLoot(journey, inventory)

    // Adjusted chance should not exceed 80%
    expect(result.adjustedChance).toBeLessThanOrEqual(0.8)
  })

  it("handles different difficulty levels", () => {
    const difficulties: Difficulty[] = [
      "starter",
      "junior",
      "expert",
      "master",
      "wizard",
    ]

    difficulties.forEach((difficulty) => {
      const journey = createMockJourney(difficulty)
      const inventory: Record<string, number> = {}

      const result = determineInventoryLoot(journey, inventory)

      // Should be able to determine loot for any difficulty
      expect(result).toBeDefined()
      expect(typeof result.shouldAwardInventoryItem).toBe("boolean")
      expect(typeof result.baseChance).toBe("number")
      expect(typeof result.adjustedChance).toBe("number")
      expect(typeof result.needMultiplier).toBe("number")
    })
  })
})
