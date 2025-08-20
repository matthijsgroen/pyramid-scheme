import { useJourneys, type JourneyState } from "@/app/state/useJourneys"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { determineMapPieceLoot } from "./mapPieceLogic"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import { useInventory } from "@/app/Inventory/useInventory"
import { useInventoryItem } from "@/data/useInventoryTranslations"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"

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
  const { findMapPiece, getJourney, nextJourneySeed, maxDifficulty } =
    useJourneys()
  const { inventory, addItems } = useInventory()
  const { t } = useTranslation("treasures")

  // Pre-calculate loot determination outside of useMemo
  const mapPieceResult = determineMapPieceLoot(activeJourney, getJourney)
  const inventoryResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    maxDifficulty,
    inventory,
    getJourney,
    nextJourneySeed
  )

  const inventoryItemHook = useInventoryItem()

  return useMemo((): {
    loot: Loot | null
    collectLoot: () => void
  } => {
    // First, check for map piece loot
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

    // If no map piece, check for inventory items
    const firstItemId = inventoryResult.itemIds[0]
    const inventoryItem = inventoryItemHook(firstItemId)
    if (
      inventoryResult.shouldAwardInventoryItem &&
      inventoryResult.itemIds.length > 0 &&
      inventoryItem
    ) {
      const itemDifficulty = getItemFirstLevel(firstItemId)

      return {
        loot: {
          itemId: firstItemId,
          itemName: inventoryItem?.name,
          itemDescription: inventoryItem?.description,
          itemComponent: (
            <HieroglyphTile
              symbol={inventoryItem?.symbol}
              difficulty={itemDifficulty}
              size="md"
            />
          ),
          rarity: "common",
        },
        collectLoot: () => {
          // Award all items from the result in a single batch operation
          if (inventoryResult.itemIds.length > 0) {
            const itemsToAdd = inventoryResult.itemIds.reduce(
              (acc, itemId) => {
                acc[itemId] = (acc[itemId] || 0) + 1
                return acc
              },
              {} as Record<string, number>
            )
            addItems(itemsToAdd)
          }
        },
      }
    }

    return { loot: null, collectLoot: () => {} }
  }, [
    mapPieceResult,
    inventoryResult,
    inventoryItemHook,
    activeJourney.journey,
    t,
    findMapPiece,
    addItems,
  ])
}
