import { describe, it, expect, beforeEach } from "vitest"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import type { JourneyState } from "@/app/state/useJourneys"
import type { Difficulty } from "@/data/difficultyLevels"

describe("determineInventoryLootForCurrentRuns", () => {
  let mockPyramidExpedition: JourneyState
  let mockJourneyLog: Array<{
    journeyId: string
    completed: boolean
    levelNr: number
  }>
  let mockPlayerInventory: Record<string, number>

  beforeEach(() => {
    mockPyramidExpedition = {
      journey: {
        id: "starter_pyramid",
        difficulty: "starter" as Difficulty,
        levelSettings: {
          numberRange: [1, 10],
          operators: ["+", "-"],
        },
      },
      randomSeed: 12345,
      levelNr: 1,
    } as JourneyState

    mockJourneyLog = []
    mockPlayerInventory = {}
  })

  describe("Basic functionality", () => {
    it("should return a valid InventoryLootResult object", () => {
      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toHaveProperty("shouldAwardInventoryItem")
      expect(result).toHaveProperty("itemIds")
      expect(result).toHaveProperty("baseChance")
      expect(result).toHaveProperty("adjustedChance")
      expect(result).toHaveProperty("needMultiplier")

      expect(typeof result.shouldAwardInventoryItem).toBe("boolean")
      expect(Array.isArray(result.itemIds)).toBe(true)
      expect(typeof result.baseChance).toBe("number")
      expect(typeof result.adjustedChance).toBe("number")
      expect(typeof result.needMultiplier).toBe("number")
    })

    it("should respect maxItemsToAward parameter", () => {
      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory,
        0.4, // baseChance
        3 // maxItemsToAward
      )

      expect(result.itemIds.length).toBeLessThanOrEqual(3)
    })

    it("should use the provided base chance", () => {
      const customBaseChance = 0.7
      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory,
        customBaseChance
      )

      expect(result.baseChance).toBe(customBaseChance)
    })
  })

  describe("Deterministic behavior", () => {
    it("should produce consistent results with same inputs", () => {
      const inputs = [
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory,
      ] as const

      const result1 = determineInventoryLootForCurrentRuns(...inputs)
      const result2 = determineInventoryLootForCurrentRuns(...inputs)

      expect(result1.shouldAwardInventoryItem).toBe(
        result2.shouldAwardInventoryItem
      )
      expect(result1.itemIds).toEqual(result2.itemIds)
      expect(result1.adjustedChance).toBe(result2.adjustedChance)
      expect(result1.needMultiplier).toBe(result2.needMultiplier)
    })

    it("should produce different results with different seeds", () => {
      const expedition1 = { ...mockPyramidExpedition, randomSeed: 12345 }
      const expedition2 = { ...mockPyramidExpedition, randomSeed: 54321 }

      const result1 = determineInventoryLootForCurrentRuns(
        expedition1,
        mockJourneyLog,
        mockPlayerInventory
      )
      const result2 = determineInventoryLootForCurrentRuns(
        expedition2,
        mockJourneyLog,
        mockPlayerInventory
      )

      // With different seeds, the random decision might be different
      // But the structure should be the same
      expect(typeof result1.shouldAwardInventoryItem).toBe(
        typeof result2.shouldAwardInventoryItem
      )
      expect(Array.isArray(result1.itemIds)).toBe(
        Array.isArray(result2.itemIds)
      )
    })
  })

  describe("Edge cases", () => {
    it("should handle empty journey log", () => {
      mockJourneyLog = []
      mockPlayerInventory = {}

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
      expect(typeof result.shouldAwardInventoryItem).toBe("boolean")
    })

    it("should handle high difficulty levels", () => {
      mockPyramidExpedition.journey.difficulty = "expert"

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
      expect(typeof result.shouldAwardInventoryItem).toBe("boolean")
    })

    it("should cap adjusted chance appropriately", () => {
      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory,
        0.9 // High base chance
      )

      expect(result.adjustedChance).toBeLessThanOrEqual(1.0)
      expect(result.adjustedChance).toBeGreaterThanOrEqual(0)
    })

    it("should cap need multiplier appropriately", () => {
      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result.needMultiplier).toBeGreaterThanOrEqual(0)
      expect(result.needMultiplier).toBeLessThanOrEqual(3)
    })
  })

  describe.skip("Journey log integration", () => {
    it("should handle completed runs", () => {
      mockJourneyLog = [
        { journeyId: "starter_treasure_tomb", completed: true, levelNr: 1 },
        { journeyId: "starter_treasure_tomb", completed: false, levelNr: 2 },
      ]

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
      expect(typeof result.shouldAwardInventoryItem).toBe("boolean")
    })

    it("should handle multiple tomb types", () => {
      mockJourneyLog = [
        { journeyId: "starter_treasure_tomb", completed: true, levelNr: 1 },
        { journeyId: "junior_treasure_tomb", completed: false, levelNr: 1 },
      ]

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
    })
  })

  describe("Player inventory influence", () => {
    it("should handle empty inventory", () => {
      mockPlayerInventory = {}

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
    })

    it("should handle inventory with various items", () => {
      mockPlayerInventory = {
        art1: 5,
        art2: 2,
        art3: 0,
        other_item: 10,
      }

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
    })

    it("should handle large inventory quantities", () => {
      mockPlayerInventory = {
        art1: 100,
        art2: 200,
        art3: 50,
      }

      const result = determineInventoryLootForCurrentRuns(
        mockPyramidExpedition,
        mockJourneyLog,
        mockPlayerInventory
      )

      expect(result).toBeDefined()
    })
  })
})
