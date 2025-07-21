import { describe, it, expect } from "vitest"
import {
  generateLevelSettings,
  percentageWithinFloor,
} from "./generateLevelSettings"
import { generateLevel } from "./generateLevel"

describe(percentageWithinFloor, () => {
  it.each([
    { level: 1, expected: 0.1 },
    { level: 5, expected: 0.5 },
    { level: 9, expected: 0.9 },
    { level: 10, expected: 1 },
    { level: 11, expected: 0.1 },
    { level: 20, expected: 1 },
    { level: 30, expected: 1 },
    { level: 40, expected: 0.5 },
  ])("returns $expected for level $level", ({ level, expected }) => {
    expect(percentageWithinFloor(level)).toBe(expected)
  })
})

describe(generateLevelSettings, () => {
  describe("the pyramid getting larger", () => {
    it.each([
      { startLevel: 1, endLevel: 2, height: 3 },
      { startLevel: 3, endLevel: 10, height: 4 },
      { startLevel: 11, endLevel: 20, height: 5 },
      { startLevel: 21, endLevel: 30, height: 6 },
      { startLevel: 31, endLevel: 50, height: 7 },
      { startLevel: 51, endLevel: 80, height: 8 },
      { startLevel: 81, endLevel: 130, height: 9 },
      { startLevel: 131, endLevel: 210, height: 10 },
      { startLevel: 211, endLevel: 340, height: 11 },
      { startLevel: 341, endLevel: 550, height: 12 },
      { startLevel: 551, endLevel: 890, height: 13 },
    ])(
      "generates a height of $height starting from level $startLevel",
      ({ startLevel, endLevel, height }) => {
        for (let level = startLevel; level <= endLevel; level++)
          expect(generateLevelSettings(level).floorCount).toBe(height)
        expect(generateLevelSettings(endLevel + 1).floorCount).not.toBe(height)
      }
    )
  })

  describe("the number of open blocks increases", () => {
    it.each([
      { level: 1, openBlockCount: 1 },
      { level: 2, openBlockCount: 3 },
      { level: 3, openBlockCount: 3 },
      { level: 4, openBlockCount: 4 },
      { level: 5, openBlockCount: 4 },
      { level: 9, openBlockCount: 5 },
    ])(
      "generates $openBlockCount open blocks for level $level",
      ({ level, openBlockCount }) => {
        expect(generateLevelSettings(level).openBlockCount).toBe(openBlockCount)
      }
    )
  })

  describe("open block boundaries", () => {
    it.each([
      { floorCount: 3, openBlockCount: (3 * 4) / 2 - 3 },
      { floorCount: 4, openBlockCount: (4 * 5) / 2 - 4 },
      { floorCount: 5, openBlockCount: (5 * 6) / 2 - 5 },
      { floorCount: 8, openBlockCount: (8 * 9) / 2 - 8 },
    ])(
      "generates $openBlockCount open blocks in a pyramid with $floorCount floors",
      ({ floorCount, openBlockCount }) => {
        expect(() =>
          generateLevel({
            floorCount,
            openBlockCount,
            lowestFloorNumberRange: [1, 10],
          })
        ).not.toThrow()
        expect(() =>
          generateLevel({
            floorCount,
            openBlockCount: openBlockCount + 1,
            lowestFloorNumberRange: [1, 10],
          })
        ).toThrow()
      }
    )
  })
})
