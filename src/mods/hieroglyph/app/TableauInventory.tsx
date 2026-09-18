import { useMemo, type FC } from "react"
import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import { journeys } from "@/data/journeys"
import { useTableauTranslations } from "./useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { buildTombCalculationSettings, generateRewardCalculation } from "../game/generateRewardCalculation"
import { tombFormulaFor } from "../game/tombFormula"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { getInventoryItemById } from "../game/symbolCatalogue"
import { getItemFirstLevel } from "../game/itemLevelLookup"
import { HieroglyphTile } from "@/ui/molecules/HieroglyphTile"
import { difficultyCompare } from "@/data/difficultyLevels"

export const TableauInventory: FC<{ journeyInfo: CombinedJourneyState }> = ({ journeyInfo }) => {
  const journey = journeys.find(j => j.id === journeyInfo.journeyId && j.exterior === "tomb")
  const { getJourney } = useJourneys()
  const tableaux = useTableauTranslations()
  const { hieroglyphProgress } = useHieroglyphProgress()

  const seed = generateNewSeed(journeyInfo.randomSeed!, journeyInfo.levelNr ?? 1)
  const runNr = journey ? (getJourney(journey.id)?.completionCount ?? 0) + 1 : 1

  const runTableaus = tableaux.filter(tab => tab.tombJourneyId === journeyInfo.journeyId && tab.runNumber === runNr)
  const tableau = runTableaus[(journeyInfo.levelNr ?? 1) - 1]
  const calculation = useMemo(() => {
    const random = mulberry32(seed)
    if (!journey || !tableau) return null
    return generateRewardCalculation(buildTombCalculationSettings(tombFormulaFor(journey.id), tableau), random)
  }, [journey, seed, tableau])

  // Only a tomb run that is actually under way has a next tableau to preview.
  if (!journey || !calculation || !journeyInfo.inProgress) {
    return null
  }

  return (
    <div className="mt-2 flex justify-center">
      <div className="flex flex-wrap gap-2 rounded bg-black/15 p-1">
        {Object.keys(calculation.symbolCounts)
          .sort((a, b) => difficultyCompare(getItemFirstLevel(a), getItemFirstLevel(b)))
          .map(symbolId => {
            const inventoryItem = getInventoryItemById(symbolId)
            const itemDifficulty = getItemFirstLevel(symbolId) || journey.difficulty
            const { found, required } = hieroglyphProgress(symbolId)
            const owned = found >= required

            return (
              <div key={symbolId} className={"flex items-center gap-1 rounded p-1 transition-colors"}>
                <HieroglyphTile
                  symbol={inventoryItem?.symbol || symbolId}
                  difficulty={itemDifficulty}
                  size="sm"
                  disabled={!owned}
                  className="pointer-events-none"
                />
                <div className="flex flex-col text-xs">
                  {owned ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-red-400" title="fragments found">
                      🧩 {found}/{required}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
