import { LootPopup } from "@/ui/LootPopup"
import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { JourneyState } from "../state/useJourneys"
import type { TreasureTombJourney } from "@/data/journeys"
import { mulberry32 } from "@/game/random"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { useInventory } from "../Inventory/useInventory"
import { Chest } from "@/ui/Chest"

export const ComparePuzzle: FC<{
  onComplete?: () => void
  activeJourney: JourneyState
}> = ({ onComplete, activeJourney }) => {
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
