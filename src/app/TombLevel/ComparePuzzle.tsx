import { LootPopup } from "@/ui/LootPopup"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { JourneyState } from "../state/useJourneys"
import type { TreasureTombJourney } from "@/data/journeys"
import { mulberry32 } from "@/game/random"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { useInventory } from "../Inventory/useInventory"
import { Chest } from "@/ui/Chest"
import { generateCompareLevel } from "@/game/generateCompareLevel"
import { tableauLevels } from "@/data/tableaus"
import { NumberChest } from "@/ui/NumberChest"
import crocodileOpen from "@/assets/crocodile-250.png"
import crocodileClosed from "@/assets/crocodile-closed-250.png"
import clsx from "clsx"
import { formulaPartToString } from "@/game/formulas"

const scaleDistance = (n: number) => 64 * (1 - Math.pow(0.5, n))

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

  const loot = getTreasureItem(lootId)

  const handleLootDismiss = () => {
    setShowLoot(false)

    // Small delay before calling completion to allow loot popup to close
    setTimeout(() => {
      addItem(lootId, 1)
      onComplete?.()
    }, 300)
  }

  const handleChestOpen = () => {
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

  return (
    <div
      className={clsx(
        "relative flex flex-1  flex-col-reverse items-center justify-center gap-4",
        hasComparison &&
          "bg-gradient-to-b from-transparent from-50% via-blue-200 via-51% to-blue-100"
      )}
    >
      <div className="absolute top-0">
        {focus === 0 && (
          <p className="mx-8 mt-4 text-center text-xl font-bold">
            {t("tomb.crocodilePuzzlePrompt")}
          </p>
        )}
      </div>
      <div
        className="absolute scale-100 transition-transform duration-400"
        style={{
          "--tw-scale-x": `${Math.max(100 + (levelData.comparisons.length - focus) * -20, 0)}%`,
          "--tw-scale-y": `${Math.max(100 + (levelData.comparisons.length - focus) * -20, 0)}%`,
        }}
      >
        <h3
          className={clsx(
            "text-lg font-bold text-amber-200 transition-opacity duration-400",
            focus !== levelData.comparisons.length && "opacity-0"
          )}
        >
          {hasComparison
            ? t(
                `tomb.crocodilePuzzle${levelData.requirements.largest === "always" ? "Always" : "Never"}`
              )
            : t("tomb.noCrocodilePuzzle")}
        </h3>
        {hasComparison ? (
          <div className="grid grid-rows-[100px_1fr]">
            <div className="col-start-1 row-start-2 rounded-t-[50%] rounded-b-[30%] bg-amber-700"></div>
            <div className="col-start-1 row-span-2 row-start-1 px-4 pb-8">
              <NumberChest
                state={lockState}
                variant="vibrant"
                onSubmit={handleLockSubmit}
                value={lockValue}
                placeholder="1-9"
                onChange={setLockValue}
                disabled={focus !== levelData.comparisons.length}
              />
            </div>
          </div>
        ) : (
          <Chest
            state={lockState}
            variant="muted"
            onClick={handleChestOpen}
            allowInteraction={!isProcessingCompletion && lockState !== "open"}
          />
        )}
      </div>
      {levelData.comparisons
        .slice()
        .reverse()
        .map((comparison, reversedIndex) => {
          const index = levelData.comparisons.length - 1 - reversedIndex
          const distanceFocus = index - focus
          const answered = answers[index] || "noneRight"
          const isMirrored = answered.endsWith("eft")
          const isClosed = !answered.startsWith("none")

          return (
            <div
              className={clsx(
                "absolute bottom-0 flex w-dvw max-w-md translate-y-0 scale-100 flex-col items-center transition-transform duration-400",
                index - focus < 0 && "blur-xs"
              )}
              style={{
                "--tw-translate-y": `calc(var(--spacing) * ${-scaleDistance(distanceFocus)})`,
                "--tw-scale-x": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
                "--tw-scale-y": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
              }}
              key={index}
            >
              <div className="flex w-full flex-1 flex-row justify-between gap-16 px-4">
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onClick={focus === index ? handleLeftClick : undefined}
                  onMouseEnter={
                    focus === index ? handleMouseOverLeft : undefined
                  }
                >
                  {formulaPartToString(comparison.left)}
                </button>
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onMouseEnter={
                    focus === index ? handleMouseOverRight : undefined
                  }
                  onClick={focus === index ? handleRightClick : undefined}
                >
                  {formulaPartToString(comparison.right)}
                </button>
              </div>
              <div className="flex-1">
                <img
                  src={isClosed ? crocodileClosed : crocodileOpen}
                  alt="crocodile"
                  className={clsx(
                    "animate-subtle-bounce transition-all delay-100 duration-200",
                    focus === index
                      ? "brightness-100 saturate-100"
                      : "brightness-110 saturate-30",
                    isMirrored ? "-scale-x-100" : "scale-x-100"
                  )}
                />
              </div>
            </div>
          )
        })}
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
