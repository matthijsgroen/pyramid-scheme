import { useMemo, type FC } from "react"
import { useJourneys, type CombinedJourneyState } from "../state/useJourneys"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { useTableauTranslations } from "@/data/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import { useInventory } from "../Inventory/useInventory"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import clsx from "clsx"
import { difficultyCompare } from "@/data/difficultyLevels"

export const TableauInventory: FC<{ journeyInfo: CombinedJourneyState }> = ({
  journeyInfo,
}) => {
  const journey = journeys.find(
    (j): j is TreasureTombJourney =>
      j.id === journeyInfo.journeyId && j.type === "treasure_tomb"
  )
  const { getJourney } = useJourneys()
  const tableaux = useTableauTranslations()
  const { inventory } = useInventory()

  const seed = generateNewSeed(
    journeyInfo.randomSeed!,
    journeyInfo.levelNr ?? 1
  )
  const runNr = journey ? (getJourney(journey.id)?.completionCount ?? 0) + 1 : 1

  const runTableaus = tableaux.filter(
    (tab) =>
      tab.tombJourneyId === journeyInfo.journeyId && tab.runNumber === runNr
  )
  const tableau = runTableaus[(journeyInfo.levelNr ?? 1) - 1]
  const calculation = useMemo(() => {
    const random = mulberry32(seed)
    if (!journey || !tableau) return null
    return generateRewardCalculation(
      {
        amountSymbols: tableau.symbolCount,
        hieroglyphIds: tableau.inventoryIds,
        numberRange: journey.levelSettings.numberRange,
        operations: journey.levelSettings.operators,
      },
      random
    )
  }, [journey, seed, tableau])

  if (!journey || !calculation) {
    return null
  }

  return (
    <div className="mt-2 flex justify-center">
      <div className="flex flex-wrap gap-2 rounded bg-black/15 p-1">
        {Object.entries(calculation.symbolCounts)
          .sort((a, b) =>
            difficultyCompare(getItemFirstLevel(a[0]), getItemFirstLevel(b[0]))
          )
          .map(([symbolId, maxNeeded]) => {
            const availableInInventory = inventory[symbolId] || 0
            const inventoryItem = getInventoryItemById(symbolId)
            const itemDifficulty =
              getItemFirstLevel(symbolId) || journey.difficulty

            return (
              <div
                key={symbolId}
                className={
                  "flex items-center gap-1 rounded p-1 transition-colors"
                }
              >
                <HieroglyphTile
                  symbol={inventoryItem?.symbol || symbolId}
                  difficulty={itemDifficulty}
                  size="sm"
                  className="pointer-events-none"
                />
                <div className="flex flex-col text-xs">
                  <span>
                    <span
                      className={clsx(
                        maxNeeded <= availableInInventory && "font-bold"
                      )}
                    >
                      {availableInInventory}
                    </span>
                    /
                    <span
                      className={clsx(
                        maxNeeded > availableInInventory &&
                          "font-bold text-red-400"
                      )}
                    >
                      {maxNeeded}
                    </span>
                  </span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
