import type { PyramidLevelSettings } from "./types"

const pyramidHeights = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

const levelNrToHeight = (levelNr: number): number => {
  const index = pyramidHeights.findIndex((height) => height * 10 >= levelNr)
  if (index === -1) {
    return 4 + pyramidHeights.length
  }
  return 4 + index
}

export const percentageWithinFloor = (levelNr: number): number => {
  const floorCount = levelNrToHeight(levelNr)

  const startFloorIndex = (pyramidHeights[floorCount - 5] ?? 0) * 10
  const endFloorIndex = (pyramidHeights[floorCount - 4] ?? 0) * 10

  const percentage =
    (levelNr - startFloorIndex) / (endFloorIndex - startFloorIndex)
  return Math.min(Math.max(percentage, 0), 1)
}

export const generateLevelSettings = (
  levelNr: number
): PyramidLevelSettings => {
  const floorCount = levelNrToHeight(levelNr)

  if (levelNr === 1) {
    return {
      floorCount: 3,
      openBlockCount: 1,
      blockedBlockCount: 0,
      lowestFloorNumberRange: [1, 3],
    }
  }
  if (levelNr === 2) {
    return {
      floorCount: 3,
      openBlockCount: 3,
      blockedBlockCount: 0,
      lowestFloorNumberRange: [1, 4],
    }
  }
  const maxBlocks = (floorCount * (floorCount + 1)) / 2
  const maxBlocksToOpen =
    maxBlocks - floorCount - (floorCount > 8 ? floorCount - 8 : 0)

  const openBlockCount = Math.floor(
    maxBlocksToOpen * (0.5 + percentageWithinFloor(levelNr) * 0.5)
  )
  const potentialToBlock = maxBlocks - openBlockCount
  const maxPercentage = Math.min(levelNr / 100, 1)
  const blockedBlockCount = Math.min(
    Math.max(
      Math.floor(
        potentialToBlock *
          (0.25 * maxPercentage - percentageWithinFloor(levelNr) * 0.2)
      ),
      0
    ),
    8
  )

  const lowestFloorNumberRange = [
    Math.floor(1 + percentageWithinFloor(levelNr) * 2),
    Math.floor(2 + percentageWithinFloor(levelNr) * 8),
  ] as [number, number]

  return {
    floorCount,
    openBlockCount,
    blockedBlockCount,
    lowestFloorNumberRange,
  }
}
