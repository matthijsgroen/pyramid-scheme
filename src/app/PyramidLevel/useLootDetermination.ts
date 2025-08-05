import { useJourneys, type JourneyState } from "@/app/state/useJourneys"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { determineMapPieceLoot } from "./mapPieceLogic"

export type Loot = {
  itemId: string
  itemName: string
  itemDescription?: string
  itemComponent: React.ReactNode
  rarity?: "common" | "rare" | "epic" | "legendary"
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
    const mapPieceResult = determineMapPieceLoot(activeJourney, journeyLog)

    if (mapPieceResult.shouldAwardMapPiece) {
      const journey = activeJourney.journey
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
  }, [activeJourney, journeyLog, t, findMapPiece])
}
