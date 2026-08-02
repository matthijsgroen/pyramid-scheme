import { useMemo, type FC } from "react"
import { useJourneys, type CombinedJourneyState } from "../state/useJourneys"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { useTableauTranslations } from "@/app/translations/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import {
  buildTombCalculationSettings,
  generateRewardCalculation,
} from "@/mods/hieroglyph/game/generateRewardCalculation"
import { useHieroglyphProgress } from "@/mods/hieroglyph/app/useHieroglyphProgress"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { HieroglyphTile } from "@/ui/molecules/HieroglyphTile"
import { difficultyCompare } from "@/data/difficultyLevels"

export const TableauInventory: FC<{ journeyInfo: CombinedJourneyState }> = ({ journeyInfo }) => {
  const journey = journeys.find(
    (j): j is TreasureTombJourney => j.id === journeyInfo.journeyId && j.type === "treasure_tomb"
  )
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
    return generateRewardCalculation(buildTombCalculationSettings(journey.levelSettings, tableau), random)
  }, [journey, seed, tableau])

  if (!journey || !calculation) {
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
