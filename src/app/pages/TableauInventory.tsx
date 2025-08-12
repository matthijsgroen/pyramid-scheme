import type { ActiveJourney } from "@/game/generateJourneyLevel"
import type { FC } from "react"
import { useJourneys } from "../state/useJourneys"
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

export const TableauInventory: FC<{ activeJourney: ActiveJourney }> = ({
  activeJourney,
}) => {
  const journey = journeys.find(
    (j): j is TreasureTombJourney =>
      j.id === activeJourney.journeyId && j.type === "treasure_tomb"
  )
  const { journeyLog } = useJourneys()
  const tableaux = useTableauTranslations()
  const { inventory } = useInventory()

  if (!journey) {
    return null
  }

  const runNr = journeyLog.filter(
    (log) => log.journeyId === journey.id && log.completed
  ).length

  const runTableaus = tableaux.filter(
    (tab) =>
      tab.tombJourneyId === activeJourney.journeyId &&
      tab.runNumber === runNr + 1
  )
  const seed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const random = mulberry32(seed)
  const tableau = runTableaus[activeJourney.levelNr - 1]
  const calculation = generateRewardCalculation(
    {
      amountSymbols: tableau.symbolCount,
      hieroglyphIds: tableau.inventoryIds,
      numberRange: journey.levelSettings.numberRange,
      operations: journey.levelSettings.operators,
    },
    random
  )

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
