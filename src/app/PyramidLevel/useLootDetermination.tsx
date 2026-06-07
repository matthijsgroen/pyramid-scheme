import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { determineMapPieceLoot } from "./mapPieceLogic"
import { determineInventoryLootForCurrentRuns } from "./inventoryLootLogic"
import { useInventory } from "@/app/Inventory/useInventory"
import { useInventoryItem } from "@/data/useInventoryTranslations"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { allTreasures, difficultyByMaterialTier, type MaterialTier } from "@/data/treasures"
import { TOMB_SYMBOLS } from "@/data/tableaus"
import { generateNewSeed, mulberry32, shuffle } from "@/game/random"

export type Loot = {
  itemId: string
  itemName: string
  itemDescription?: string
  itemComponent: React.ReactNode
  rarity?: "common" | "rare" | "epic" | "legendary"
}

export const useLootDetermination = (
  activeJourney: CombinedJourneyState
): { loot: Loot | null; collectLoot: () => void } => {
  const { findMapPiece, getJourney, nextJourneySeed, maxDifficulty } = useJourneys()
  const { inventory, addItems } = useInventory()
  const { t } = useTranslation("treasures")

  const ownedTreasures = allTreasures.filter(t => (inventory[t.id] ?? 0) > 0)
  const bonusMapFragmentChance = ownedTreasures.reduce((sum, t) => sum + (t.effects?.mapFragmentChance ?? 0), 0)

  // Pre-calculate loot determination outside of useMemo
  const mapPieceResult = determineMapPieceLoot(activeJourney, getJourney, bonusMapFragmentChance)
  const inventoryResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    maxDifficulty,
    inventory,
    getJourney,
    nextJourneySeed,
    0.4,
    1,
    3,
    ownedTreasures
  )

  const inventoryItemHook = useInventoryItem()

  const isLastLevel = activeJourney.levelNr >= activeJourney.journey.levelCount

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

    // If no map piece, check for inventory items (includes moreLootChance bonus items)
    const firstItemId = inventoryResult.itemIds[0]
    const inventoryItem = inventoryItemHook(firstItemId)
    if (inventoryResult.shouldAwardInventoryItem && inventoryResult.itemIds.length > 0 && inventoryItem) {
      const itemDifficulty = getItemFirstLevel(firstItemId)

      return {
        loot: {
          itemId: firstItemId,
          itemName: inventoryItem?.name,
          itemDescription: inventoryItem?.description,
          itemComponent: <HieroglyphTile symbol={inventoryItem?.symbol} difficulty={itemDifficulty} size="md" />,
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

    // Check for expedition bonus (guaranteed items on last level of expedition)
    if (isLastLevel) {
      const bonusByTier: Partial<Record<MaterialTier, number>> = {}
      for (const treasure of ownedTreasures) {
        const effect = treasure.effects?.expeditionBonus
        if (!effect) continue
        bonusByTier[effect.tier] = (bonusByTier[effect.tier] ?? 0) + effect.amount
      }

      const expeditionBonusItemIds: string[] = []
      if (Object.keys(bonusByTier).length > 0) {
        const expSeed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr + 3000)
        const expRandom = mulberry32(expSeed)
        for (const [tier, amount] of Object.entries(bonusByTier) as [MaterialTier, number][]) {
          const tierDifficulty = difficultyByMaterialTier[tier]
          const tierItems = TOMB_SYMBOLS[tierDifficulty]
          const shuffledItems = shuffle(tierItems, expRandom)
          for (let i = 0; i < amount; i++) {
            expeditionBonusItemIds.push(shuffledItems[i % shuffledItems.length])
          }
        }
      }

      if (expeditionBonusItemIds.length > 0) {
        const firstBonusId = expeditionBonusItemIds[0]
        const bonusItem = inventoryItemHook(firstBonusId)
        if (bonusItem) {
          const itemDifficulty = getItemFirstLevel(firstBonusId)
          return {
            loot: {
              itemId: firstBonusId,
              itemName: bonusItem.name,
              itemDescription: bonusItem.description,
              itemComponent: <HieroglyphTile symbol={bonusItem.symbol} difficulty={itemDifficulty} size="md" />,
              rarity: "epic",
            },
            collectLoot: () => {
              const itemsToAdd = expeditionBonusItemIds.reduce(
                (acc, id) => {
                  acc[id] = (acc[id] || 0) + 1
                  return acc
                },
                {} as Record<string, number>
              )
              addItems(itemsToAdd)
            },
          }
        }
      }
    }

    return { loot: null, collectLoot: () => {} }
  }, [
    mapPieceResult,
    inventoryResult,
    inventoryItemHook,
    activeJourney.journey,
    activeJourney.randomSeed,
    activeJourney.levelNr,
    t,
    findMapPiece,
    addItems,
    isLastLevel,
    ownedTreasures,
  ])
}
