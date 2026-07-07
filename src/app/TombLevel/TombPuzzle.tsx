import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { TableauLevel } from "@/data/tableaus"
import { type RewardCalculation } from "@/game/generateRewardCalculation"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"
import { revealText } from "@/support/revealText"
import { useInventory } from "@/app/Inventory/useInventory"
import { useProgression } from "@/app/state/useProgression"
import { createTableauPuzzleState, isTableauPuzzleCompleted, toggleTableauTile } from "@/game/tableauPuzzleState"
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

  // Domain state: which tiles are filled and how much inventory that used
  const [state, setState] = useState(createTableauPuzzleState)
  const { filledPositions, symbolCounts, inventoryUsage } = state

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
  const isPuzzleCompleted = useMemo(
    () => isTableauPuzzleCompleted(state, calculation.symbolCounts),
    [calculation.symbolCounts, state]
  )

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
    const filledSlots = Object.keys(filledPositions).length
    return totalSlots > 0 ? filledSlots / totalSlots : 0
  }, [calculation, filledPositions])

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
    // Don't allow removal if puzzle is completed
    if (filledPositions[position] > 0 && isPuzzleCompleted) return
    setState(prev => toggleTableauTile(prev, symbolId, position, calculation.symbolCounts, inventory[symbolId] || 0))
  }

  // Helper function to find all empty positions for a given symbol
  const findEmptyPositionsForSymbol = (symbolId: string): string[] => {
    const positions: string[] = []
    const positionsObject = createPositionOverview(calculation)
    Object.entries(positionsObject).forEach(([position, value]) => {
      const symId = calculation.symbolMapping[value]
      if (symId === symbolId && !filledPositions[position]) {
        positions.push(position)
      }
    })

    return positions
  }

  const handleInventoryClick = (symbolId: string) => {
    const currentUsage = inventoryUsage[symbolId] || 0
    const availableInInventory = inventory[symbolId] || 0
    const currentPlaced = symbolCounts[symbolId] || 0
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
      const usedInPuzzle = symbolCounts[symbolId] || 0
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
      filledState={{ filledPositions, symbolCounts }}
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
