import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import { type RewardCalculation } from "@/game/generateRewardCalculation"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { NumberLock } from "@/ui/NumberLock"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { type FilledTileState } from "../Formulas/FormulaPart"
import { clsx } from "clsx"
import { useState, useMemo, type FC, type FormEvent, useEffect, use } from "react"
import { useTranslation } from "react-i18next"
import { revealText } from "@/support/revealText"
import { TombTableau } from "./TombTableau"
import { TombDoor } from "@/ui/TombDoor"
import { FezContext } from "../fez/context"
import { createPositionOverview } from "../Formulas/filledPositions"

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
  const [inventoryUsage, setInventoryUsage] = useState<Record<string, number>>({})
  // State for NumberLock
  const [lockCode, setLockCode] = useState("")
  const [lockState, setLockState] = useState<"empty" | "error" | "open">("empty")
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)

  // Check if puzzle is completely solved (all symbols placed)
  const isPuzzleCompleted = useMemo(() => {
    return Object.entries(calculation.symbolCounts).every(([symbolId, maxNeeded]) => {
      const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
      return usedInPuzzle === maxNeeded
    })
  }, [calculation.symbolCounts, filledState.symbolCounts])

  const { showConversation } = use(FezContext)
  useEffect(() => {
    if (Object.keys(inventory).length === 0) return
    // if inventory - inventory usage is empty, and puzzle is not filled in, trigger conversation
    const notEnough = Object.entries(calculation.symbolCounts).some(([symbolId, maxNeeded]) => {
      const availableInInventory = inventory[symbolId] || 0
      return availableInInventory < maxNeeded
    })

    if (notEnough) {
      showConversation("notEnoughHieroglyphs")
    }
  }, [
    calculation.symbolCounts,
    filledState.symbolCounts,
    inventory,
    inventoryUsage,
    isPuzzleCompleted,
    showConversation,
  ])

  const handleTileClick = (symbolId: string, position: string) => {
    setFilledState(prev => {
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
        setInventoryUsage(prevUsage => ({
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
          setInventoryUsage(prevUsage => ({
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
    const positionsObject = createPositionOverview(calculation)
    Object.entries(positionsObject).forEach(([position, value]) => {
      const symId = calculation.symbolMapping[value]
      if (symId === symbolId && !filledState.filledPositions[position]) {
        positions.push(position)
      }
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
          Object.entries(inventoryUsage).filter(([, usedCount]) => usedCount > 0)
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
    <div className="flex flex-1 flex-row overflow-y-auto">
      <div className="flex flex-1">{/** left side */}</div>
      <div className="flex min-w-fit flex-1 flex-col items-center justify-center overflow-y-auto px-4 text-white">
        <div className="flex flex-1">{/** top side */}</div>
        <TombDoor
          className="flex flex-2 flex-col items-center justify-center"
          open={lockState === "open"}
          difficulty={difficulty}
        >
          {/* NumberLock appears when puzzle is completed */}
          {isPuzzleCompleted && (
            <div className={clsx("order-2 mb-6 animate-slide-down")}>
              <form
                onSubmit={handleLockSubmit}
                className={clsx(
                  "flex flex-col items-center rounded-b-lg p-4",
                  hieroglyphLevelColors[difficulty],
                  lockState === "error" && "animate-shake"
                )}
              >
                <NumberLock
                  state={lockState}
                  variant="muted"
                  value={lockCode}
                  onChange={handleLockChange}
                  onSubmit={handleLockSubmit}
                  disabled={isProcessingCompletion}
                  placeholder={revealText(calculation.mainFormula.result.toString(), 0)}
                  maxLength={4}
                />
              </form>
            </div>
          )}
          <TombTableau
            difficulty={difficulty}
            tableau={tableau}
            calculation={calculation}
            filledState={filledState}
            onTileClick={handleTileClick}
          />

          {/* Available symbols inventory - hide when puzzle is completed */}
          {!isPuzzleCompleted && (
            <div className="mt-8 mb-4 w-fit rounded bg-black/20 p-2">
              <h3 className="mb-2 text-sm font-bold">{t("ui.availableSymbols")}</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(calculation.symbolCounts)
                  .sort((a, b) => difficultyCompare(getItemFirstLevel(a[0]), getItemFirstLevel(b[0])))
                  .map(([symbolId, maxNeeded]) => {
                    const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
                    const usedFromInventory = inventoryUsage[symbolId] || 0
                    const availableInInventory = inventory[symbolId] || 0
                    const inventoryItem = getInventoryItemById(symbolId)
                    const itemDifficulty = getItemFirstLevel(symbolId) || difficulty
                    const canPlace = availableInInventory > usedFromInventory && usedInPuzzle < maxNeeded

                    return (
                      <button
                        key={symbolId}
                        className={clsx(
                          "flex items-center gap-1 rounded p-1 transition-colors select-auto",
                          canPlace ? "cursor-pointer bg-white/10 hover:bg-white/20" : "cursor-not-allowed opacity-50"
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
                            <span className={clsx(maxNeeded > availableInInventory && "font-bold text-red-400")}>
                              {maxNeeded}
                            </span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </TombDoor>
      </div>
      <div className="flex flex-1">{/** right side */}</div>
    </div>
  )
}
