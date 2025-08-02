import { describe, expect, it } from "vitest"
import { generateLevel } from "@/game/generateLevel"
import type { PyramidLevelSettings } from "@/game/types"
import { mulberry32 } from "@/game/random"
import { getAnswers } from "@/game/state"

describe(generateLevel, () => {
  it.each([
    { floorCount: 1, expectedBlockCount: 1 },
    { floorCount: 2, expectedBlockCount: 3 },
    { floorCount: 4, expectedBlockCount: 10 },
    { floorCount: 6, expectedBlockCount: 21 },
    { floorCount: 8, expectedBlockCount: 36 },
    { floorCount: 9, expectedBlockCount: 45 },
  ])(
    "generates a level with the correct number of blocks (floorCount: $floorCount) = $expectedBlockCount",
    ({ floorCount, expectedBlockCount }) => {
      const settings: PyramidLevelSettings = {
        floorCount,
        openBlockCount: 0,
        blockedBlockCount: 0,
        lowestFloorNumberRange: [4, 15],
      }
      const level = generateLevel(1, settings)
      expect(level.pyramid.blocks.length).toBe(expectedBlockCount)
    }
  )

  it.each<{ range: [min: number, max: number] }>([
    { range: [1, 10] },
    { range: [10, 20] },
    { range: [12, 12] },
  ])(
    "generates a level with the correct range of values (range: $range)",
    ({ range }) => {
      const random = mulberry32(12345)
      const floorCount = 3
      const settings: PyramidLevelSettings = {
        floorCount,
        openBlockCount: 0,
        blockedBlockCount: 0,
        lowestFloorNumberRange: range,
      }
      const bottomFloorIndex = ((floorCount - 1) * floorCount) / 2
      const level = generateLevel(1, settings, random)

      const lowestLevelValues = level.pyramid.blocks
        .slice(bottomFloorIndex)
        .map((block) => block.value)
        .filter((value): value is number => value !== undefined)

      expect(lowestLevelValues.length).toBeGreaterThanOrEqual(2)

      const minValue = Math.min(...lowestLevelValues)
      const maxValue = Math.max(...lowestLevelValues)
      expect(minValue).toBeGreaterThanOrEqual(range[0])
      expect(maxValue).toBeLessThanOrEqual(range[1])
    }
  )

  describe("opening blocks", () => {
    it("will open the correct number of blocks", () => {
      const settings: PyramidLevelSettings = {
        floorCount: 5,
        openBlockCount: 4,
        blockedBlockCount: 0,
        lowestFloorNumberRange: [1, 10],
      }
      const level = generateLevel(1, settings)
      const openBlocks = level.pyramid.blocks.filter((block) => block.isOpen)
      expect(openBlocks.length).toBe(settings.openBlockCount)
      expect(Object.values(level.values)).toHaveLength(settings.openBlockCount)
    })

    it("will keep the level solveable", () => {
      const random = mulberry32(12345)

      const settings: PyramidLevelSettings = {
        floorCount: 4, // 10 blocks
        openBlockCount: 6,
        blockedBlockCount: 0,
        lowestFloorNumberRange: [1, 10],
      }
      const level = generateLevel(1, settings, random)

      const values = getAnswers(level.pyramid)
      expect(values).toEqual(level.values)
    })
  })
})
