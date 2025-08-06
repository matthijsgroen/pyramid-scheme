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
  const { journeyLog, findMapPiece } = useJourneys()
  const { inventory, addItem } = useInventory()
  const { t } = useTranslation("treasures")

  // Pre-calculate loot determination outside of useMemo
  const mapPieceResult = determineMapPieceLoot(activeJourney, journeyLog)
  const inventoryResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    journeyLog,
    inventory
  )

  // Always call the hook, but with a fallback value when no item IDs
  // For multiple items, we'll use the first item for the hook and handle the rest differently
  const firstItemId = inventoryResult.itemIds[0] || ""
  const inventoryItemHook = useInventoryItem(firstItemId)

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
    if (
      inventoryResult.shouldAwardInventoryItem &&
      inventoryResult.itemIds.length > 0 &&
      inventoryItemHook
    ) {
      const firstItemId = inventoryResult.itemIds[0]
      const itemDifficulty = getItemFirstLevel(firstItemId)

      return {
        loot: {
          itemId: firstItemId,
          itemName: inventoryItemHook.name,
          itemDescription: inventoryItemHook.description,
          itemComponent: (
            <HieroglyphTile
              symbol={inventoryItemHook.symbol}
              difficulty={itemDifficulty}
              size="md"
            />
          ),
          rarity: "common",
        },
        collectLoot: () => {
          // Award all items from the result
          inventoryResult.itemIds.forEach((itemId) => {
            addItem(itemId, 1)
          })
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
    addItem,
  ])
}
