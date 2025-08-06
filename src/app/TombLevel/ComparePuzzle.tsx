import { LootPopup } from "@/ui/LootPopup"
import { NumberLock } from "@/ui/NumberLock"
import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { JourneyState } from "../state/useJourneys"
import type { TreasureTombJourney } from "@/data/journeys"
import { mulberry32 } from "@/game/random"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { useInventory } from "../Inventory/useInventory"

export const ComparePuzzle: FC<{
  onComplete?: () => void
  activeJourney: JourneyState
}> = ({ onComplete, activeJourney }) => {
  const { t } = useTranslation("common")
  const [lockCode, setLockCode] = useState("")
  const [lockState, setLockState] = useState<"empty" | "error" | "open">(
    "empty"
  )
  const getTreasureItem = useTreasureItem()
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const { inventory, addItem } = useInventory()

  const number = "7"

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

  const handleLockSubmit = (code: string) => {
    // Prevent multiple submissions during processing
    if (isProcessingCompletion) {
      return
    }

    if (code === number) {
      setLockState("open")
      setIsProcessingCompletion(true)

      setShowLoot(true)
      setIsProcessingCompletion(false)
    } else {
      setLockState("error")
      // Reset to empty state after a delay
      setTimeout(() => {
        setLockState("empty")
        setLockCode("")
      }, 2000)
    }
  }

  const handleLockChange = (code: string) => {
    setLockCode(code)
    if (lockState === "error") {
      setLockState("empty")
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-bold text-amber-200">
        {t("ui.crocodileAlways")}
      </h3>
      <NumberLock
        state={lockState}
        variant="muted"
        value={lockCode}
        onChange={handleLockChange}
        onSubmit={handleLockSubmit}
        disabled={isProcessingCompletion}
        placeholder={"?"}
        maxLength={1}
      />
      <h3 className="text-lg font-bold text-amber-200">
        {t("ui.answerNow")}: {number}
      </h3>
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
