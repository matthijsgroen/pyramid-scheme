import { useJourneyTranslation } from "@/data/useJourneyTranslations"
import { use, useEffect, type FC } from "react"
import { useTranslation } from "react-i18next"
import { useInventory } from "@/app/Inventory/useInventory"
import { determineInventoryLootForCurrentRuns } from "@/app/PyramidLevel/inventoryLootLogic"
import type { PyramidJourney } from "@/data/journeys"
import { useJourneys, type JourneyState } from "../state/useJourneys"
import { mulberry32 } from "@/game/random"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { useInventoryItem } from "@/data/useInventoryTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { FezContext } from "../fez/context"

export const ExpeditionCompletionOverlay: FC<{
  onJourneyComplete?: () => void
  newPyramidJourneyId?: string
  activeJourney: JourneyState
}> = ({ onJourneyComplete, newPyramidJourneyId, activeJourney }) => {
  const { t } = useTranslation("common")
  const getTranslatedItem = useInventoryItem()
  const { addItems, inventory } = useInventory()
  const { journeyLog } = useJourneys()
  const journey = activeJourney.journey as PyramidJourney
  const random = mulberry32(activeJourney.randomSeed + 10000)
  const [min, max] = journey.rewards.completed.pieces
  const itemCount = Math.floor(random() * (max - min + 1)) + min
  const lootResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    journeyLog,
    inventory,
    1.0,
    itemCount
  )
  const { showConversation } = use(FezContext)

  useEffect(() => {
    showConversation("expeditionCompleted")
  }, [showConversation])

  const newJourneyName = useJourneyTranslation(
    newPyramidJourneyId ?? "id"
  )?.name

  const onCollectLoot = () => {
    if (lootResult.shouldAwardInventoryItem && lootResult.itemIds.length > 0) {
      const itemsToAdd = lootResult.itemIds.reduce(
        (acc, itemId) => {
          acc[itemId] = (acc[itemId] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
      addItems(itemsToAdd)
    }
    onJourneyComplete?.()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 rounded-lg bg-white/80 p-4 backdrop-blur-md">
        <span className="text-center font-pyramid text-2xl font-bold text-green-500">
          {t("ui.expeditionCompleted")}
        </span>
        {lootResult.itemIds.length > 0 && (
          <>
            <h3 className="mt-2 text-center text-yellow-700">
              {t("loot.expeditionReward")}:
            </h3>
            <div className="mt-2 flex flex-row flex-wrap justify-center gap-4">
              {lootResult.itemIds.map((itemId, index) => {
                const translatedItem = getTranslatedItem(itemId)
                const itemDifficulty = getItemFirstLevel(itemId)
                if (!translatedItem) {
                  return null
                }
                return (
                  <div
                    key={itemId + index}
                    className="flex shrink-0 flex-col gap-2"
                  >
                    <HieroglyphTile
                      symbol={translatedItem.symbol}
                      difficulty={itemDifficulty}
                      size="md"
                    />
                    <div className="text-center text-xs">
                      {translatedItem.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {newPyramidJourneyId && (
          <span className="mt-2 text-center text-yellow-700">
            {t("ui.newExpeditionUnlocked")}:{" "}
            <strong className="font-semibold">{newJourneyName}</strong>
          </span>
        )}
        <button
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={onCollectLoot}
        >
          {t("ui.goBackToBase")}
        </button>
      </div>
    </div>
  )
}
