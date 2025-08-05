import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import {
  type Formula,
  type RewardCalculation,
} from "@/game/generateRewardCalculation"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import {
  egyptianDeities,
  egyptianProfessions,
  egyptianAnimals,
  egyptianArtifacts,
} from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { FormulaPart, type FilledTileState } from "./FormulaPart"
import { clsx } from "clsx"
import { useState, useMemo, type FC } from "react"
import { useTranslation } from "react-i18next"

// Helper function to count total number slots in a formula
const countFormulaSlots = (formula: Formula): number => {
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

// Helper function to get inventory item by ID
const getInventoryItemById = (id: string) => {
  const allItems = [
    ...egyptianDeities,
    ...egyptianProfessions,
    ...egyptianAnimals,
    ...egyptianArtifacts,
  ]
  return allItems.find((item) => item.id === id)
}

const obfuscate = (text: string, percentage: number): string => {
  // replace characters with ? based on a noise pattern for natural reveal
  if (percentage === undefined || percentage <= 0) {
    return text.replace(/[a-zA-Z]/g, "?")
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
  formula: Formula
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
      = {showResult ? <span>{formula.result}</span> : "??"}
    </div>
  )
}

export const TombPuzzle: FC<{
  tableau: TableauLevel
  calculation: RewardCalculation
  difficulty: Difficulty
}> = ({ tableau, calculation, difficulty }) => {
  const { t } = useTranslation("common")

  // Get player's actual inventory
  const { inventory } = useInventory()

  // State for managing which tiles are filled
  const [filledState, setFilledState] = useState<FilledTileState>({
    symbolCounts: {},
    filledPositions: {},
  })

  // State for tracking how many inventory items are used in the puzzle
  const [inventoryUsage, setInventoryUsage] = useState<Record<string, number>>(
    {}
  )

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

  const handleTileClick = (symbolId: string, position: string) => {
    setFilledState((prev) => {
      const newState = { ...prev }

      // If position is already filled, remove the tile
      if (newState.filledPositions[position] > 0) {
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
      const checkFormulaPart = (part: Formula, prefix: string) => {
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-white">
      <div
        className={clsx(
          "flex w-full flex-col gap-4 rounded-lg p-4 text-slate-500 shadow-lg",
          hieroglyphLevelColors[difficulty]
        )}
      >
        <h1 className="text-center text-2xl">
          {obfuscate(tableau.name, solvedPercentage)}
        </h1>

        {calculation.hintFormulas.map((formula, index) => (
          <div key={index} className="text-lg">
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
          <span className="text-2xl">
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
        <div>{obfuscate(tableau.description, solvedPercentage)}</div>
      </div>

      {/* Available symbols inventory */}
      <div className="mb-4 rounded bg-black/20 p-2">
        <h3 className="mb-2 text-sm font-bold">{t("ui.availableSymbols")}</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(calculation.symbolCounts).map(
            ([symbolId, maxNeeded]) => {
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
                      {availableInInventory}
                    </span>
                    <span className="text-gray-400">
                      {t("ui.need")}: {maxNeeded}
                    </span>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}
