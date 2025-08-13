import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import type { Formula as FormulaType } from "@/game/formulas"
import { type RewardCalculation } from "@/game/generateRewardCalculation"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { NumberLock } from "@/ui/NumberLock"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { FormulaPart, type FilledTileState } from "./FormulaPart"
import { clsx } from "clsx"
import { useState, useMemo, type FC, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

// Helper function to count total number slots in a formula
const countFormulaSlots = (formula: FormulaType): number => {
  let count = 0
  if (typeof formula.left === "number") {
    count += 1
  } else {
    count += countFormulaSlots(formula.left)
  }
  if (typeof formula.right === "number") {
    count += 1
  } else {
    count += countFormulaSlots(formula.right)
  }
  return count
}

const revealText = (text: string, percentage?: number): string => {
  // replace characters with ? based on a noise pattern for natural reveal
  if (percentage === undefined || percentage <= 0) {
    return text.replace(/[a-zA-Z0-9]/g, "?")
  }
  if (percentage >= 1) {
    return text
  }

  // Simple pseudo-random number generator for consistent results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Create a seed based on the text content for consistency
  const textSeed = text.split("").reduce((acc, char, index) => {
    return acc + char.charCodeAt(0) * (index + 1)
  }, 0)

  let letterIndex = 0
  const obfuscatedText = text.split("").map((char, charIndex) => {
    if (/[a-zA-Z]/.test(char)) {
      // Generate a consistent pseudo-random value for this letter position
      const randomValue = seededRandom(textSeed + letterIndex + charIndex)
      const shouldObfuscate = randomValue > percentage
      letterIndex++
      return shouldObfuscate ? "?" : char
    }
    return char
  })
  return obfuscatedText.join("")
}

const Formula: FC<{
  formula: FormulaType
  showResult: boolean
  difficulty: Difficulty
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  onTileClick: (symbolId: string, position: string) => void
  formulaIndex: number
}> = ({
  formula,
  showResult,
  difficulty,
  symbolMapping,
  filledState,
  onTileClick,
  formulaIndex,
}) => {
  return (
    <div>
      <FormulaPart
        formula={formula}
        difficulty={difficulty}
        symbolMapping={symbolMapping}
        filledState={filledState}
        onTileClick={onTileClick}
        positionPrefix={`formula-${formulaIndex}`}
      />{" "}
      ={" "}
      {showResult ? (
        <span>{formula.result}</span>
      ) : (
        revealText(formula.result.toString(), 0)
      )}
    </div>
  )
}

export const TombPuzzle: FC<{
  tableau: TableauLevel
  calculation: RewardCalculation
  difficulty: Difficulty
  onComplete?: () => void
}> = ({ tableau, calculation, difficulty, onComplete }) => {
  const { t } = useTranslation("common")

  // Get player's actual inventory
  const { inventory, removeItems } = useInventory()

  // State for managing which tiles are filled
  const [filledState, setFilledState] = useState<FilledTileState>({
    symbolCounts: {},
    filledPositions: {},
  })

  // State for tracking how many inventory items are used in the puzzle
  const [inventoryUsage, setInventoryUsage] = useState<Record<string, number>>(
    {}
  )

  // State for NumberLock
  const [lockCode, setLockCode] = useState("")
  const [lockState, setLockState] = useState<"empty" | "error" | "open">(
    "empty"
  )
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)

  // Calculate solved percentage based on filled tiles
  const solvedPercentage = useMemo(() => {
    // Count total slots across all formulas
    const totalSlots =
      calculation.hintFormulas.reduce(
        (sum, formula) => sum + countFormulaSlots(formula),
        0
      ) + countFormulaSlots(calculation.mainFormula)

    // Count filled slots
    const filledSlots = Object.keys(filledState.filledPositions).length

    return totalSlots > 0 ? filledSlots / totalSlots : 0
  }, [calculation, filledState.filledPositions])

  // Check if puzzle is completely solved (all symbols placed)
  const isPuzzleCompleted = useMemo(() => {
    return Object.entries(calculation.symbolCounts).every(
      ([symbolId, maxNeeded]) => {
        const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
        return usedInPuzzle === maxNeeded
      }
    )
  }, [calculation.symbolCounts, filledState.symbolCounts])

  const handleTileClick = (symbolId: string, position: string) => {
    setFilledState((prev) => {
      const newState = { ...prev }

      // If position is already filled, remove the tile (only if puzzle is not completed)
      if (newState.filledPositions[position] > 0) {
        // Don't allow removal if puzzle is completed
        if (isPuzzleCompleted) {
          return prev
        }

        newState.filledPositions = { ...newState.filledPositions }
        delete newState.filledPositions[position]
        newState.symbolCounts = {
          ...newState.symbolCounts,
          [symbolId]: Math.max(0, (newState.symbolCounts[symbolId] || 0) - 1),
        }

        // Decrease inventory usage
        setInventoryUsage((prevUsage) => ({
          ...prevUsage,
          [symbolId]: Math.max(0, (prevUsage[symbolId] || 0) - 1),
        }))
      } else {
        // Check if we have available inventory items to use
        const currentUsage = inventoryUsage[symbolId] || 0
        const availableInInventory = inventory[symbolId] || 0
        const currentPlaced = newState.symbolCounts[symbolId] || 0
        const maxNeeded = calculation.symbolCounts[symbolId] || 0

        // Only place if we have inventory available and haven't exceeded puzzle requirements
        if (availableInInventory > currentUsage && currentPlaced < maxNeeded) {
          newState.filledPositions = {
            ...newState.filledPositions,
            [position]: 1,
          }
          newState.symbolCounts = {
            ...newState.symbolCounts,
            [symbolId]: currentPlaced + 1,
          }

          // Increase inventory usage
          setInventoryUsage((prevUsage) => ({
            ...prevUsage,
            [symbolId]: currentUsage + 1,
          }))
        }
      }

      return newState
    })
  }

  // Helper function to find all empty positions for a given symbol
  const findEmptyPositionsForSymbol = (symbolId: string): string[] => {
    const positions: string[] = []

    // Check all formulas (hints + main)
    const allFormulas = [...calculation.hintFormulas, calculation.mainFormula]

    allFormulas.forEach((formula, formulaIndex) => {
      const checkFormulaPart = (part: FormulaType, prefix: string) => {
        if (
          typeof part.left === "number" &&
          calculation.symbolMapping[part.left] === symbolId
        ) {
          const position = `${prefix}-left`
          if (!filledState.filledPositions[position]) {
            positions.push(position)
          }
        } else if (typeof part.left !== "number") {
          checkFormulaPart(part.left, `${prefix}-left`)
        }

        if (
          typeof part.right === "number" &&
          calculation.symbolMapping[part.right] === symbolId
        ) {
          const position = `${prefix}-right`
          if (!filledState.filledPositions[position]) {
            positions.push(position)
          }
        } else if (typeof part.right !== "number") {
          checkFormulaPart(part.right, `${prefix}-right`)
        }
      }

      checkFormulaPart(formula, `formula-${formulaIndex}`)
    })

    return positions
  }

  const handleInventoryClick = (symbolId: string) => {
    const currentUsage = inventoryUsage[symbolId] || 0
    const availableInInventory = inventory[symbolId] || 0
    const currentPlaced = filledState.symbolCounts[symbolId] || 0
    const maxNeeded = calculation.symbolCounts[symbolId] || 0

    // Check if we have available inventory items and haven't exceeded puzzle requirements
    if (availableInInventory > currentUsage && currentPlaced < maxNeeded) {
      // Find the first empty position for this symbol
      const emptyPositions = findEmptyPositionsForSymbol(symbolId)

      if (emptyPositions.length > 0) {
        // Fill the first available position
        handleTileClick(symbolId, emptyPositions[0])
      }
    }
  }

  // NumberLock handlers
  const handleLockSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    // Prevent multiple submissions during processing
    if (isProcessingCompletion) {
      return
    }

    if (lockCode === calculation.mainFormula.result.toString()) {
      setLockState("open")
      setIsProcessingCompletion(true)

      // After 2 seconds, remove used inventory items and call onComplete
      setTimeout(() => {
        // Remove used inventory items in a single batch operation
        const itemsToRemove = Object.fromEntries(
          Object.entries(inventoryUsage).filter(
            ([, usedCount]) => usedCount > 0
          )
        )
        if (Object.keys(itemsToRemove).length > 0) {
          removeItems(itemsToRemove)
        }

        // Call completion handler
        onComplete?.()
        setIsProcessingCompletion(false)
      }, 2000)
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
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 text-white">
      {/* NumberLock appears when puzzle is completed */}
      {isPuzzleCompleted && (
        <div
          className={clsx(
            "order-2 flex animate-slide-down flex-col items-center rounded-b-lg p-4",
            hieroglyphLevelColors[difficulty]
          )}
        >
          <form onSubmit={handleLockSubmit}>
            <NumberLock
              state={lockState}
              variant="muted"
              value={lockCode}
              onChange={handleLockChange}
              onSubmit={handleLockSubmit}
              disabled={isProcessingCompletion}
              placeholder={revealText(
                calculation.mainFormula.result.toString(),
                0
              )}
              maxLength={4}
            />
          </form>
        </div>
      )}
      <div
        className={clsx(
          "relative z-20 flex w-full max-w-md flex-col gap-4 rounded-lg border-t-4 p-4 text-slate-500 shadow-lg",
          hieroglyphLevelColors[difficulty]
        )}
      >
        <h1 className="text-center font-pyramid text-2xl">
          {revealText(tableau.name, solvedPercentage)}
        </h1>
        <div>{revealText(tableau.description, solvedPercentage)}</div>

        {calculation.hintFormulas.map((formula, index) => (
          <div key={index} className="text-3xl">
            <Formula
              formula={formula}
              showResult={true}
              difficulty={difficulty}
              symbolMapping={calculation.symbolMapping}
              filledState={filledState}
              onTileClick={handleTileClick}
              formulaIndex={index}
            />
          </div>
        ))}
        <div>
          <span className="text-4xl">
            <Formula
              formula={calculation.mainFormula}
              showResult={false}
              difficulty={difficulty}
              symbolMapping={calculation.symbolMapping}
              filledState={filledState}
              onTileClick={handleTileClick}
              formulaIndex={calculation.hintFormulas.length}
            />
          </span>
        </div>
      </div>

      {/* Available symbols inventory - hide when puzzle is completed */}
      {!isPuzzleCompleted && (
        <div className="mt-8 mb-4 rounded bg-black/20 p-2">
          <h3 className="mb-2 text-sm font-bold">{t("ui.availableSymbols")}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(calculation.symbolCounts)
              .sort((a, b) =>
                difficultyCompare(
                  getItemFirstLevel(a[0]),
                  getItemFirstLevel(b[0])
                )
              )
              .map(([symbolId, maxNeeded]) => {
                const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
                const usedFromInventory = inventoryUsage[symbolId] || 0
                const availableInInventory = inventory[symbolId] || 0
                const inventoryItem = getInventoryItemById(symbolId)
                const itemDifficulty = getItemFirstLevel(symbolId) || difficulty
                const canPlace =
                  availableInInventory > usedFromInventory &&
                  usedInPuzzle < maxNeeded

                return (
                  <div
                    key={symbolId}
                    className={clsx(
                      "flex items-center gap-1 rounded p-1 transition-colors",
                      canPlace
                        ? "cursor-pointer bg-white/10 hover:bg-white/20"
                        : "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => canPlace && handleInventoryClick(symbolId)}
                  >
                    <HieroglyphTile
                      symbol={inventoryItem?.symbol || symbolId}
                      difficulty={itemDifficulty}
                      size="sm"
                      disabled={!canPlace}
                      className="pointer-events-none"
                    />
                    <div className="flex flex-col text-xs">
                      <span>
                        {availableInInventory - usedFromInventory}/
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
      )}
    </div>
  )
}
