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

  // Always call the hook, but with a fallback value when no item ID
  const inventoryItemHook = useInventoryItem(inventoryResult.itemId || "")

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
      inventoryResult.itemId &&
      inventoryItemHook
    ) {
      const itemDifficulty = getItemFirstLevel(inventoryResult.itemId)

      return {
        loot: {
          itemId: inventoryResult.itemId,
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
          if (inventoryResult.itemId) {
            addItem(inventoryResult.itemId, 1)
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
    addItem,
  ])
}
