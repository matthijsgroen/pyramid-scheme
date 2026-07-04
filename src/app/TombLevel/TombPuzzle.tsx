import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { TableauLevel } from "@/data/tableaus"
import { type RewardCalculation } from "@/game/generateRewardCalculation"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"
import { revealText } from "@/support/revealText"
import { useInventory } from "@/app/Inventory/useInventory"
import { useProgression } from "@/app/state/useProgression"
import { type FilledTileState } from "@/ui/molecules/FormulaPart"
import { useState, useMemo, useRef, type FC, type FormEvent, useEffect, use } from "react"
import { useTranslation } from "react-i18next"
import { TombPuzzleView } from "@/ui/organisms/TombPuzzleView"
import type { InventoryStripItem } from "@/ui/molecules/HieroglyphInventoryStrip"
import type { OrderedFormula } from "@/ui/organisms/TombTableau"
import { FezContext } from "../fez/context"
import { createPositionOverview } from "../Formulas/filledPositions"
import { mulberry32, shuffle } from "@/game/random"
import { hashString } from "@/support/hashString"
import type { Formula as FormulaType } from "@/app/Formulas/formulas"

// Counts the number of number-tile slots in a formula (used for solved-percentage display)
const countFormulaSlots = (formula: FormulaType): number => {
  let count = 0
  if (typeof formula.left === "number") {
    // nothing to do
  } else if ("symbol" in formula.left) {
    count += 1
  } else {
    count += countFormulaSlots(formula.left)
  }
  if (typeof formula.right === "number") {
    // nothing to do
  } else if ("symbol" in formula.right) {
    count += 1
  } else {
    count += countFormulaSlots(formula.right)
  }
  return count
}

export const TombPuzzle: FC<{
  tableau: TableauLevel
  calculation: RewardCalculation
  difficulty: Difficulty
  onComplete?: () => void
  onFindHieroglyphs?: () => void
}> = ({ tableau, calculation, difficulty, onComplete, onFindHieroglyphs }) => {
  const { t } = useTranslation("common")

  // Get player's actual inventory
  const { inventory, removeItems } = useInventory()
  const { perks } = useProgression()
  const scribesEyeSlots = perks.scribesEyeLevel === 3 ? Infinity : perks.scribesEyeLevel

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
  const [annotations, setAnnotations] = useState<Record<string, string>>({})
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    },
    []
  )

  // Check if puzzle is completely solved (all symbols placed)
  const isPuzzleCompleted = useMemo(() => {
    return Object.entries(calculation.symbolCounts).every(([symbolId, maxNeeded]) => {
      const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
      return usedInPuzzle === maxNeeded
    })
  }, [calculation.symbolCounts, filledState.symbolCounts])

  const notEnough = useMemo(() => {
    if (Object.keys(inventory).length === 0) return false
    return Object.entries(calculation.symbolCounts).some(([symbolId, maxNeeded]) => {
      const availableInInventory = inventory[symbolId] || 0
      return availableInInventory < maxNeeded
    })
  }, [calculation.symbolCounts, inventory])

  const { showConversation } = use(FezContext)
  useEffect(() => {
    if (notEnough) {
      showConversation("notEnoughHieroglyphs")
    }
  }, [notEnough, showConversation])

  const resolveTile = useMemo(() => (symbolId: string) => resolveHieroglyphSymbol(symbolId, difficulty), [difficulty])

  const solvedPercentage = useMemo(() => {
    const totalSlots =
      calculation.hintFormulas.reduce((sum, formula) => sum + countFormulaSlots(formula), 0) +
      countFormulaSlots(calculation.mainFormula)
    const filledSlots = Object.keys(filledState.filledPositions).length
    return totalSlots > 0 ? filledSlots / totalSlots : 0
  }, [calculation, filledState.filledPositions])

  const hintFormulas: OrderedFormula[] = useMemo(() => {
    const ordered = calculation.hintFormulas.map((f, i) => ({ formula: f, index: i }))
    if (difficulty === "starter" || difficulty === "junior") return ordered
    const random = mulberry32(hashString(tableau.name))
    return shuffle(ordered, random)
  }, [calculation.hintFormulas, difficulty, tableau.name])

  const handleAnnotationChange = (symbolId: string, value: string) => {
    setAnnotations(prev => ({ ...prev, [symbolId]: value }))
  }

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

      lockTimerRef.current = setTimeout(() => {
        const itemsToRemove = Object.fromEntries(
          Object.entries(inventoryUsage).filter(([, usedCount]) => usedCount > 0)
        )
        if (Object.keys(itemsToRemove).length > 0) {
          removeItems(itemsToRemove)
        }
        onComplete?.()
        setIsProcessingCompletion(false)
      }, 2000)
    } else {
      setLockState("error")
      lockTimerRef.current = setTimeout(() => {
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

  const inventoryItems: InventoryStripItem[] = Object.entries(calculation.symbolCounts)
    .sort((a, b) => difficultyCompare(getItemFirstLevel(a[0]), getItemFirstLevel(b[0])))
    .map(([symbolId, maxNeeded]) => {
      const usedInPuzzle = filledState.symbolCounts[symbolId] || 0
      const usedFromInventory = inventoryUsage[symbolId] || 0
      const availableInInventory = inventory[symbolId] || 0
      const inventoryItem = getInventoryItemById(symbolId)
      const itemDifficulty = getItemFirstLevel(symbolId) || difficulty
      const canPlace = availableInInventory > usedFromInventory && usedInPuzzle < maxNeeded

      return {
        symbolId,
        symbol: inventoryItem?.symbol,
        difficulty: itemDifficulty,
        availableCount: availableInInventory - usedFromInventory,
        maxNeeded,
        canPlace,
      }
    })

  return (
    <TombPuzzleView
      difficulty={difficulty}
      tableau={tableau}
      calculation={calculation}
      filledState={filledState}
      resolveTile={resolveTile}
      hintFormulas={hintFormulas}
      solvedPercentage={solvedPercentage}
      annotations={annotations}
      onTileClick={handleTileClick}
      onAnnotationChange={handleAnnotationChange}
      scribesEyeSlots={scribesEyeSlots}
      isPuzzleCompleted={isPuzzleCompleted}
      lockState={lockState}
      lockValue={lockCode}
      onLockChange={handleLockChange}
      onLockSubmit={handleLockSubmit}
      lockDisabled={isProcessingCompletion}
      lockPlaceholder={revealText(calculation.mainFormula.result.toString(), 0)}
      inventoryTitle={t("ui.availableSymbols")}
      inventoryItems={inventoryItems}
      onInventoryItemClick={handleInventoryClick}
      showFindHieroglyphsButton={notEnough && !isPuzzleCompleted}
      findHieroglyphsLabel={t("ui.findMissingHieroglyphs")}
      onFindHieroglyphs={onFindHieroglyphs}
    />
  )
}
