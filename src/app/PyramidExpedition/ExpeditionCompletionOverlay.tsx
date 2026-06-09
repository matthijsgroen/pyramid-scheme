import { useJourneyTranslation } from "@/data/useJourneyTranslations"
import { use, useEffect, type FC } from "react"
import { useTranslation } from "react-i18next"
import { useInventory } from "@/app/Inventory/useInventory"
import { determineInventoryLootForCurrentRuns } from "@/app/PyramidLevel/inventoryLootLogic"
import { journeys as allJourneys, type PyramidJourney } from "@/data/journeys"
import { useJourneys, type CombinedJourneyState } from "../state/useJourneys"
import { mulberry32 } from "@/game/random"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { useInventoryItem } from "@/data/useInventoryTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { FezContext } from "../fez/context"
import { Badge } from "@/ui/Badge"

export const ExpeditionCompletionOverlay: FC<{
  onJourneyComplete?: () => void
  onStartJourney?: (journeyId: string) => void
  newPyramidJourneyId?: string
  activeJourney: CombinedJourneyState
}> = ({ onJourneyComplete, onStartJourney, newPyramidJourneyId, activeJourney }) => {
  const { t } = useTranslation("common")
  const getTranslatedItem = useInventoryItem()
  const { addItems, inventory } = useInventory()
  const { getJourney, maxDifficulty, nextJourneySeed } = useJourneys()
  const journey = activeJourney.journey as PyramidJourney
  const random = mulberry32(activeJourney.randomSeed + 10000)
  const [min, max] = journey.rewards.completed.pieces
  const itemCount = Math.floor(random() * (max - min + 1)) + min
  const lootResult = determineInventoryLootForCurrentRuns(
    activeJourney,
    maxDifficulty,
    inventory,
    getJourney,
    nextJourneySeed,
    1.0,
    itemCount
  )
  const { showConversation } = use(FezContext)

  useEffect(() => {
    showConversation("expeditionCompleted")
  }, [showConversation])

  const newPyramidJourneyName = useJourneyTranslation(newPyramidJourneyId ?? "id")?.name

  // Detect if a tomb just became unlocked (all map pieces for this difficulty collected, tomb never completed)
  const tombJourney = allJourneys.find(j => j.type === "treasure_tomb" && j.difficulty === journey.difficulty)
  const pyramidJourneysForDifficulty = allJourneys.filter(
    j => j.type === "pyramid" && j.difficulty === journey.difficulty
  )
  const allMapPiecesFound = pyramidJourneysForDifficulty.every(j => getJourney(j.id)?.foundMapPiece === true)
  const tombState = tombJourney ? getJourney(tombJourney.id) : undefined
  const newTombJourneyId =
    allMapPiecesFound && tombJourney && (tombState?.completionCount ?? 0) === 0 ? tombJourney.id : undefined
  const newTombJourneyName = useJourneyTranslation(newTombJourneyId ?? "id")?.name

  const collectLoot = () => {
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
  }

  const onCollectLoot = () => {
    collectLoot()
    onJourneyComplete?.()
  }

  const handleStartJourney = (journeyId: string) => {
    collectLoot()
    onStartJourney?.(journeyId)
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 rounded-lg bg-white/80 p-4 backdrop-blur-md">
        <span className="text-center font-pyramid text-2xl font-bold text-green-500">
          {t("ui.expeditionCompleted")}
        </span>
        {lootResult.itemIds.length > 0 && (
          <>
            <h3 className="mt-2 text-center text-yellow-700">{t("loot.expeditionReward")}:</h3>
            <div className="mt-2 flex flex-row flex-wrap justify-center gap-4">
              {Object.entries(lootResult.itemsWithCounts || {}).map(([itemId, count], index) => {
                const translatedItem = getTranslatedItem(itemId)
                const itemDifficulty = getItemFirstLevel(itemId)
                if (!translatedItem) {
                  return null
                }
                return (
                  <div key={itemId + index} className="flex flex-col items-center gap-2">
                    <Badge count={count}>
                      <HieroglyphTile symbol={translatedItem.symbol} difficulty={itemDifficulty} size="md" />
                    </Badge>
                    <div className="text-center text-xs text-amber-700">{translatedItem.name}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {newPyramidJourneyId && (
          <span className="mt-2 text-center text-yellow-700">
            {t("ui.newExpeditionUnlocked")}: <strong className="font-semibold">{newPyramidJourneyName}</strong>
          </span>
        )}
        {newTombJourneyId && (
          <span className="mt-2 text-center text-yellow-700">
            {t("ui.newTombUnlocked")}: <strong className="font-semibold">{newTombJourneyName}</strong>
          </span>
        )}
        <div className="mt-2 flex flex-col gap-2">
          {newPyramidJourneyId && (
            <button
              className="rounded bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
              onClick={() => handleStartJourney(newPyramidJourneyId)}
            >
              {t("ui.startJourney", { name: newPyramidJourneyName })}
            </button>
          )}
          {newTombJourneyId && (
            <button
              className="rounded bg-stone-600 px-4 py-2 font-semibold text-white hover:bg-stone-700"
              onClick={() => handleStartJourney(newTombJourneyId)}
            >
              {t("ui.startJourney", { name: newTombJourneyName })}
            </button>
          )}
          <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600" onClick={onCollectLoot}>
            {t("ui.goBackToBase")}
          </button>
        </div>
      </div>
    </div>
  )
}
