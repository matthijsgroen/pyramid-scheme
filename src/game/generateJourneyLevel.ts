import { type PyramidJourney } from "@/data/journeys"
import { generateLevel } from "@/game/generateLevel"
import type { PyramidLevel, PyramidLevelSettings } from "@/game/types"

export type Item = {
  type: "hieroglyph" | "tablet" | "coins"
  id: string
  quantity: number
}

const scaleIntRange = (
  startRange: [number, number],
  endRange: [number, number],
  progress: number
): [number, number] => [
  scaleInt([startRange[0], endRange[0]], progress),
  scaleInt([startRange[1], endRange[1]], progress),
]

const scaleInt = (numbers: [startNumber: number, endNumber: number], progress: number): number =>
  Math.round(scaleNumber(numbers, progress))

const scaleNumber = (numbers: [startNumber: number, endNumber: number], progress: number): number =>
  numbers[0] + (numbers[1] - numbers[0]) * progress

export const generateJourneyLevel = (
  journey: PyramidJourney,
  levelNr: number,
  random = Math.random
): PyramidLevel | null => {
  if (levelNr > journey.levelCount) {
    return null
  }
  const journeyProgress = levelNr / journey.levelCount

  const floorCount = scaleInt(
    [
      journey.levelSettings.startFloorCount,
      journey.levelSettings.endFloorCount ?? journey.levelSettings.startFloorCount,
    ],
    journeyProgress
  )
  const maxBlocks = (floorCount * (floorCount + 1)) / 2
  const maxBlocksToOpen = maxBlocks - floorCount - (floorCount > 8 ? floorCount - 8 : 0)

  const blocksToOpen = journey.levelSettings.blocksOpen ?? [0.5, 1]
  const blocksToBlock = journey.levelSettings.blocksBlocked ?? [0, 0]

  const openBlockCount = Math.floor(maxBlocksToOpen * scaleNumber(blocksToOpen, journeyProgress))
  const blockedBlockPercentage = scaleNumber(blocksToBlock, journeyProgress)

  const potentialToBlock = maxBlocksToOpen - openBlockCount
  const blockedBlockCount = Math.min(Math.max(Math.floor(potentialToBlock * (0.8 * blockedBlockPercentage)), 0), 8)
  const settings: PyramidLevelSettings = {
    floorCount,
    openBlockCount,
    blockedBlockCount,
    restrictedBlockedFloors: journey.levelSettings.blocksBlockedRestricted,
    restrictedOpenFloors: journey.levelSettings.blocksOpenRestricted,
    lowestFloorNumberRange: scaleIntRange(
      journey.levelSettings.startNumberRange,
      journey.levelSettings.endNumberRange ?? journey.levelSettings.startNumberRange,
      journeyProgress
    ),
  }

  return generateLevel(levelNr, settings, random)
}
