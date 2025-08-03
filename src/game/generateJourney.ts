import { journeys } from "@/data/journeys"
import { generateLevel } from "@/game/generateLevel"
import { generateNewSeed, mulberry32 } from "@/game/random"
import type { PyramidLevel, PyramidLevelSettings } from "@/game/types"

export type Item = {
  type: "hieroglyph" | "tablet" | "coins"
  id: string
  quantity: number
}

export type ActiveJourney = {
  journeyId: string
  randomSeed: number
  levelNr: number
  startTime: number
  endTime?: number
  completed: boolean
  canceled?: boolean
  plannedLoot?: Record<number, Item[]>
  completionTreasures?: Item[]
}

export const startJourney = (
  journeyId: string,
  randomSeed: number
): ActiveJourney => {
  return {
    journeyId,
    randomSeed,
    levelNr: 1,
    startTime: Date.now(),
    completed: false,
  }
}

const scaleRange = (
  startRange: [number, number],
  endRange: [number, number],
  progress: number
): [number, number] => [
  scaleNumber(startRange[0], endRange[0], progress),
  scaleNumber(startRange[1], endRange[1], progress),
]

const scaleNumber = (
  startNumber: number,
  endNumber: number,
  progress: number
): number => Math.round(startNumber + (endNumber - startNumber) * progress)

export const generateJourneyLevel = (
  activeJourney: ActiveJourney,
  levelNr: number
): PyramidLevel | null => {
  const randomSeed = generateNewSeed(activeJourney.randomSeed, levelNr)
  const random = mulberry32(randomSeed)

  const journey = journeys.find((j) => j.id === activeJourney.journeyId)
  if (!journey) {
    throw new Error(`Journey with id ${activeJourney.journeyId} not found`)
  }
  if (journey.type !== "pyramid") {
    return null
  }
  if (levelNr > journey.levelCount) {
    return null
  }
  const journeyProgress = levelNr / journey.levelCount

  const floorCount = scaleNumber(
    journey.levelSettings.startFloorCount,
    journey.levelSettings.endFloorCount ??
      journey.levelSettings.startFloorCount,
    journeyProgress
  )
  const maxBlocks = (floorCount * (floorCount + 1)) / 2
  const maxBlocksToOpen =
    maxBlocks - floorCount - (floorCount > 8 ? floorCount - 8 : 0)

  const openBlockCount = Math.floor(
    maxBlocksToOpen * (0.5 + journeyProgress * 0.5)
  )
  const potentialToBlock = maxBlocks - openBlockCount

  const maxPercentage = Math.min(levelNr / 100, 1)
  const blockedBlockCount = Math.min(
    Math.max(
      Math.floor(
        potentialToBlock * (0.25 * maxPercentage - journeyProgress * 0.2)
      ),
      0
    ),
    8
  )
  const settings: PyramidLevelSettings = {
    floorCount,
    openBlockCount,
    blockedBlockCount,
    lowestFloorNumberRange: scaleRange(
      journey.levelSettings.startNumberRange,
      journey.levelSettings.endNumberRange ??
        journey.levelSettings.startNumberRange,
      journeyProgress
    ),
  }

  return generateLevel(levelNr, settings, random)
}
