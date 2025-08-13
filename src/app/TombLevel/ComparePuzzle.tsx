import { LootPopup } from "@/ui/LootPopup"
import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { JourneyState } from "../state/useJourneys"
import type { TreasureTombJourney } from "@/data/journeys"
import { mulberry32 } from "@/game/random"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { useInventory } from "../Inventory/useInventory"
import { Chest } from "@/ui/Chest"
import { generateCompareLevel } from "@/game/generateCompareLevel"
import { tableauLevels } from "@/data/tableaus"

export const ComparePuzzle: FC<{
  onComplete?: () => void
  activeJourney: JourneyState
  runNumber: number
}> = ({ onComplete, activeJourney, runNumber }) => {
  const { t } = useTranslation("common")
  const [lockState, setLockState] = useState<"empty" | "error" | "open">(
    "empty"
  )
  const getTreasureItem = useTreasureItem()
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const { inventory, addItem } = useInventory()

  const journey = activeJourney.journey as TreasureTombJourney

  const collectedTreasures = Object.keys(inventory)

  const eligibleTreasures = journey.treasures.filter(
    (t) => !collectedTreasures.includes(t.id)
  )
  const random = mulberry32(activeJourney.randomSeed + 12345)
  const lootId =
    eligibleTreasures[Math.floor(random() * eligibleTreasures.length)]?.id

  const loot = getTreasureItem(lootId)

  const handleLootDismiss = () => {
    setShowLoot(false)

    // Small delay before calling completion to allow loot popup to close
    setTimeout(() => {
      addItem(lootId, 1)
      onComplete?.()
    }, 300)
  }

  const handleLockSubmit = () => {
    // Prevent multiple submissions during processing
    if (isProcessingCompletion) {
      return
    }

    setLockState("open")
    setIsProcessingCompletion(true)

    setTimeout(() => {
      setShowLoot(true)
      setIsProcessingCompletion(false)
    }, 1500)
  }

  const levelSeed = activeJourney.randomSeed + runNumber * 3210

  const levelData = useMemo(() => {
    const random = mulberry32(levelSeed)
    const tableau = tableauLevels.find(
      (t) => t.tombJourneyId === journey.id && t.runNumber === runNumber
    )
    const digit = Math.round(random() * 9)
    const always = random() > 0.5

    const result = generateCompareLevel(
      {
        compareAmount: journey.levelSettings.compareAmount,
        numberOfSymbols: tableau?.symbolCount ?? 2,
        numberRange: journey.levelSettings.numberRange,
        operators: journey.levelSettings.operators,
      },
      { digit, largest: always ? "always" : "never" }
    )
    return result
  }, [
    journey.id,
    journey.levelSettings.compareAmount,
    journey.levelSettings.numberRange,
    journey.levelSettings.operators,
    runNumber,
    levelSeed,
  ])
  console.log(levelData)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h3 className="text-lg font-bold text-amber-200">
        {t("ui.noCrocodilePuzzle")}
      </h3>
      <Chest
        state={lockState}
        variant="vibrant"
        onClick={handleLockSubmit}
        allowInteraction={!isProcessingCompletion && lockState !== "open"}
      />
      {loot && (
        <>
          <LootPopup
            isOpen={showLoot}
            itemName={loot.name}
            itemDescription={loot.description}
            itemComponent={loot.symbol}
            rarity={"legendary"}
            onDismiss={handleLootDismiss}
          />
        </>
      )}
    </div>
  )
}
