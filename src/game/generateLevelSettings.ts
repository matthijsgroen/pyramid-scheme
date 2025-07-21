import type { PyramidLevelSettings } from "./types"

const pyramidHeights = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

export const percentageWithinFloor = (levelNr: number): number => {
  const floorCount =
    4 + pyramidHeights.findIndex((height) => height * 10 >= levelNr)

  const startFloorIndex = (pyramidHeights[floorCount - 5] ?? 0) * 10
  const endFloorIndex = (pyramidHeights[floorCount - 4] ?? 0) * 10

  const percentage =
    (levelNr - startFloorIndex) / (endFloorIndex - startFloorIndex)
  return Math.min(Math.max(percentage, 0), 1)
}

export const generateLevelSettings = (
  levelNr: number
): PyramidLevelSettings => {
  const floorCount =
    4 + pyramidHeights.findIndex((height) => height * 10 >= levelNr)

  if (levelNr === 1) {
    return {
      floorCount: 3,
      openBlockCount: 1,
      lowestFloorNumberRange: [1, 3],
    }
  }
  if (levelNr === 2) {
    return {
      floorCount: 3,
      openBlockCount: 3,
      lowestFloorNumberRange: [1, 4],
    }
  }
  const maxBlocksToOpen = (floorCount * (floorCount + 1)) / 2 - floorCount
  const openBlockCount = Math.floor(
    maxBlocksToOpen * (0.2 + percentageWithinFloor(levelNr) * 0.8)
  )

  const lowestFloorNumberRange = [
    Math.floor(1 + percentageWithinFloor(levelNr) * 2),
    Math.floor(2 + percentageWithinFloor(levelNr) * 8),
  ] as [number, number]

  return {
    floorCount,
    openBlockCount,
    lowestFloorNumberRange,
  }
}
