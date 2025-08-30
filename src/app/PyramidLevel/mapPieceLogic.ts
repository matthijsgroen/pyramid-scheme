import type { Journey } from "@/data/journeys"
import { type CombinedJourneyState } from "@/app/state/useJourneys"
import { generateNewSeed, mulberry32 } from "@/game/random"

export type MapPieceResult = {
  shouldAwardMapPiece: boolean
  mapPieceChance: number
}

const getMapPieceChance = (journey: Journey, journeyCount: number): number => {
  if (journey.type !== "pyramid") {
    return 0
  }
  return journey.rewards.mapPiece.startChance + journeyCount * journey.rewards.mapPiece.chanceIncrease
}

export const determineMapPieceLoot = (
  activeJourney: CombinedJourneyState,
  getJourney: (journeyId: string) => CombinedJourneyState | undefined
): MapPieceResult => {
  const journeyInfo = getJourney(activeJourney.journeyId)
  const journeyCount = journeyInfo?.completionCount || 0

  const lootSeed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const random = mulberry32(lootSeed)
  const foundMapPiece = journeyInfo?.foundMapPiece || false

  const journey = activeJourney.journey

  const mapPieceChance = foundMapPiece ? 0 : getMapPieceChance(journey, journeyCount)

  const shouldAwardMapPiece = random() < mapPieceChance

  return {
    shouldAwardMapPiece,
    mapPieceChance,
  }
}
