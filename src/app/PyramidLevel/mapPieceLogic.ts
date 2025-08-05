import type { Journey } from "@/data/journeys"
import type { JourneyState } from "@/app/state/useJourneys"
import { generateNewSeed, mulberry32 } from "@/game/random"

export type MapPieceResult = {
  shouldAwardMapPiece: boolean
  mapPieceChance: number
}

const getMapPieceChance = (journey: Journey, journeyCount: number): number => {
  if (journey.type !== "pyramid") {
    return 0
  }
  return (
    journey.rewards.mapPiece.startChance +
    journeyCount * journey.rewards.mapPiece.chanceIncrease
  )
}

export const determineMapPieceLoot = (
  activeJourney: JourneyState,
  journeyLog: Array<{
    journeyId: string
    completed: boolean
    foundMapPiece?: boolean
  }>
): MapPieceResult => {
  const journeyCount = journeyLog.filter(
    (journey) =>
      journey.journeyId === activeJourney.journeyId && journey.completed
  ).length

  const lootSeed = generateNewSeed(
    activeJourney.randomSeed,
    activeJourney.levelNr
  )
  const random = mulberry32(lootSeed)

  const foundMapPiece = journeyLog.some(
    (journey) =>
      journey.journeyId === activeJourney.journeyId &&
      journey.foundMapPiece === true
  )

  const journey = activeJourney.journey

  const mapPieceChance = foundMapPiece
    ? 0
    : getMapPieceChance(journey, journeyCount)

  const shouldAwardMapPiece = random() < mapPieceChance

  return {
    shouldAwardMapPiece,
    mapPieceChance,
  }
}
