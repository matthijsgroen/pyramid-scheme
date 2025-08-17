import { useCallback, useMemo, useState } from "react"
import { useInventory } from "../Inventory/useInventory"
import type { TreasureTombJourney } from "@/data/journeys"
import type { JourneyState } from "../state/useJourneys"
import { mulberry32 } from "@/game/random"
import { tableauLevels } from "@/data/tableaus"
import { generateCompareLevel } from "@/game/generateCompareLevel"

export const useCrocodilePuzzleControls = ({
  activeJourney,
  runNumber,
  onComplete,
}: {
  activeJourney: JourneyState
  runNumber: number
  onComplete?: () => void
}) => {
  const [lockState, setLockState] = useState<"empty" | "error" | "open">(
    "empty"
  )
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const { inventory, addItem } = useInventory()
  const [lockValue, setLockValue] = useState("")
  const [answers, setAnswers] = useState<{
    [key: number]: "left" | "right" | "noneLeft" | "noneRight"
  }>({})

  const journey = activeJourney.journey as TreasureTombJourney

  const collectedTreasures = Object.keys(inventory)

  const eligibleTreasures = journey.treasures.filter(
    (t) => !collectedTreasures.includes(t.id)
  )
  const random = mulberry32(activeJourney.randomSeed + 12345)
  const lootId =
    eligibleTreasures[Math.floor(random() * eligibleTreasures.length)]?.id

  const handleLootDismiss = useCallback(() => {
    setShowLoot(false)

    // Small delay before calling completion to allow loot popup to close
    setTimeout(() => {
      addItem(lootId, 1)
      onComplete?.()
    }, 300)
  }, [addItem, lootId, onComplete])

  const handleChestOpen = useCallback(() => {
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
  }, [isProcessingCompletion])

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
      { digit, largest: always ? "always" : "never" },
      random
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

  const hasComparison = levelData.comparisons.length > 0

  const [focus, setFocus] = useState(0)

  const handleLockSubmit = (value: string) => {
    // Prevent multiple submissions during processing
    if (isProcessingCompletion) {
      return
    }
    if (levelData.requirements.digit.toString() !== value) {
      setLockState("error")
      setIsProcessingCompletion(false)
      setFocus(0)
      setAnswers({})
      return
    }

    setLockState("open")
    setIsProcessingCompletion(true)

    setTimeout(() => {
      setShowLoot(true)
      setIsProcessingCompletion(false)
    }, 1500)
  }

  const handleMouseOverLeft = useCallback(() => {
    setAnswers((answers) => {
      const currentAnswer = answers[focus] ?? "noneRight"
      if (!currentAnswer.startsWith("none")) {
        return answers
      }

      return {
        ...answers,
        [focus]: "noneLeft",
      }
    })
  }, [focus])

  const handleMouseOverRight = useCallback(() => {
    setAnswers((answers) => {
      const currentAnswer = answers[focus] ?? "noneLeft"
      if (!currentAnswer.startsWith("none")) {
        return answers
      }

      return {
        ...answers,
        [focus]: "noneRight",
      }
    })
  }, [focus])

  const handleLeftClick = useCallback(() => {
    const activeCompare = levelData.comparisons[focus]
    if (!activeCompare) return
    const isLeftLargest = activeCompare.left.result > activeCompare.right.result
    if (!isLeftLargest) return
    const currentAnswer = answers[focus] ?? "noneLeft"
    if (!currentAnswer.startsWith("none")) return
    const needsTurn = currentAnswer !== "noneLeft"

    setAnswers((answers) => ({
      ...answers,
      [focus]: needsTurn ? "noneLeft" : "left",
    }))
    if (needsTurn) {
      setTimeout(() => {
        setAnswers((answers) => ({
          ...answers,
          [focus]: "left",
        }))
      }, 400)
    }

    setTimeout(
      () => {
        setFocus((prev) => prev + 1)
      },
      needsTurn ? 600 : 200
    )
  }, [focus, levelData.comparisons, answers])

  const handleRightClick = useCallback(() => {
    const activeCompare = levelData.comparisons[focus]
    if (!activeCompare) return
    const isRightLargest =
      activeCompare.right.result > activeCompare.left.result
    if (!isRightLargest) return

    const currentAnswer = answers[focus] ?? "noneRight"
    if (!currentAnswer.startsWith("none")) return
    const needsTurn = currentAnswer !== "noneRight"
    setAnswers((answers) => ({
      ...answers,
      [focus]: needsTurn ? "noneRight" : "right",
    }))

    if (needsTurn) {
      setTimeout(() => {
        setAnswers((answers) => ({
          ...answers,
          [focus]: "right",
        }))
      }, 400)
    }

    setTimeout(
      () => {
        setFocus((prev) => prev + 1)
      },
      needsTurn ? 600 : 200
    )
  }, [focus, levelData.comparisons, answers])

  return {
    lockState,
    isProcessingCompletion,
    showLoot,
    hasComparison,
    focus,
    levelData,
    lockValue,
    lootId,
    answers,
    setLockValue,
    handleLockSubmit,
    handleChestOpen,
    handleLeftClick,
    handleRightClick,
    handleLootDismiss,
    handleMouseOverLeft,
    handleMouseOverRight,
  }
}
