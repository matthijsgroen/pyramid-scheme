import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { determineMapPieceLoot } from "./mapPieceLogic"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import { determineExpeditionBonus } from "./expeditionBonusLogic"
import { useInventory } from "@/app/Inventory/useInventory"
import { useInventoryItem } from "@/app/translations/useInventoryTranslations"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"

export type Loot = {
  itemId: string
  itemName: string
  itemDescription?: string
  itemComponent: React.ReactNode
  rarity?: "common" | "rare" | "epic" | "legendary"
}

const toItemCounts = (itemIds: string[]): Record<string, number> =>
  itemIds.reduce(
    (acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

const makeInventoryLoot = (
  itemIds: string[],
  rarity: Loot["rarity"],
  getItem: (id: string) => { name: string; description: string; symbol: string } | null,
  addItems: (items: Record<string, number>) => void
): { loot: Loot; collectLoot: () => void } | null => {
  const firstId = itemIds[0]
  const item = getItem(firstId)
  if (!item) return null
  return {
    loot: {
      itemId: firstId,
      itemName: item.name,
      itemDescription: item.description,
      itemComponent: <HieroglyphTile symbol={item.symbol} difficulty={getItemFirstLevel(firstId)} size="md" />,
      rarity,
    },
    collectLoot: () => addItems(toItemCounts(itemIds)),
  }
}

export const useLootDetermination = (
  activeJourney: CombinedJourneyState
): { loot: Loot | null; collectLoot: () => void } => {
  const { getJourney, nextJourneySeed, maxDifficulty } = useJourneys()
  const { hasMapPiece, markMapPieceFound } = useProgression()
  const { inventory, addItems } = useInventory()
  const { t } = useTranslation("treasures")

  const mapPieceResult = determineMapPieceLoot(activeJourney, getJourney, hasMapPiece(activeJourney.journeyId), 0)
  const inventoryResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    maxDifficulty,
    inventory,
    getJourney,
    nextJourneySeed,
    0.4,
    1,
    3
  )
  const expeditionItemIds = determineExpeditionBonus(activeJourney)

  const inventoryItemHook = useInventoryItem()

  return useMemo((): { loot: Loot | null; collectLoot: () => void } => {
    if (mapPieceResult.shouldAwardMapPiece) {
      return {
        loot: {
          itemId: "mapPiece",
          itemName: t("mapPieces.name"),
          itemDescription: t(`mapPieces.descriptions.${activeJourney.journey.difficulty}`),
          itemComponent: "📜",
          rarity: "rare",
        },
        collectLoot: () => markMapPieceFound(activeJourney.journeyId),
      }
    }

    if (inventoryResult.shouldAwardInventoryItem && inventoryResult.itemIds.length > 0) {
      const result = makeInventoryLoot(inventoryResult.itemIds, "common", inventoryItemHook, addItems)
      if (result) return result
    }

    if (expeditionItemIds.length > 0) {
      const result = makeInventoryLoot(expeditionItemIds, "epic", inventoryItemHook, addItems)
      if (result) return result
    }

    return { loot: null, collectLoot: () => {} }
  }, [
    mapPieceResult,
    inventoryResult,
    expeditionItemIds,
    inventoryItemHook,
    activeJourney.journey,
    activeJourney.journeyId,
    t,
    markMapPieceFound,
    addItems,
  ])
}
