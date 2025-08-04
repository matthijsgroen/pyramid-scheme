import { useJourneys, type JourneyState } from "@/app/state/useJourneys"
import type { Journey } from "@/data/journeys"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export type Loot = {
  itemId: string
  itemName: string
  itemDescription?: string
  itemComponent: React.ReactNode
  rarity?: "common" | "rare" | "epic" | "legendary"
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

export const useLootDetermination = (
  activeJourney: JourneyState
): { loot: Loot | null; collectLoot: () => void } => {
  const { journeyLog, findMapPiece } = useJourneys()
  const { t } = useTranslation("treasures")

  return useMemo((): {
    loot: Loot | null
    collectLoot: () => void
  } => {
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
        journey.journeyId === activeJourney.journeyId && journey.foundMapPiece
    )

    const journey = activeJourney.journey

    const mapPieceChance = foundMapPiece
      ? 0
      : getMapPieceChance(journey, journeyCount)

    const mapPieceLoot = random() < mapPieceChance
    if (mapPieceLoot) {
      return {
        loot: {
          itemId: "mapPiece",
          itemName: t("mapPieces.name"),
          itemDescription: t(`mapPieces.descriptions.${journey.difficulty}`),
          itemComponent: "📜",
          rarity: "rare",
        },
        collectLoot: () => {
          findMapPiece()
        },
      }
    }

    return { loot: null, collectLoot: () => {} }
  }, [activeJourney, journeyLog, t])
}
