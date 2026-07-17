import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { TableauLevel } from "@/data/tableaus"
import { type RewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"
import { revealText } from "@/support/revealText"
import { useHieroglyphProgress } from "@/mods/hieroglyph/app/useHieroglyphProgress"
import { usePuzzleProgress } from "@/mods/puzzle/app/usePuzzleProgress"
import {
  createTableauPuzzleState,
  isTableauPuzzleCompleted,
  toggleTableauTile,
} from "@/mods/hieroglyph/game/tableauPuzzleState"
import { useState, useMemo, useRef, type FC, type FormEvent, useEffect, use } from "react"
import { useTranslation } from "react-i18next"
import { TombPuzzleView } from "@/ui/organisms/TombPuzzleView"
import type { InventoryStripItem } from "@/ui/molecules/HieroglyphInventoryStrip"
import type { OrderedFormula } from "@/ui/organisms/TombTableau"
import { FezContext } from "../fez/context"
import { createPositionOverview } from "@/mods/hieroglyph/game/filledPositions"
import { mulberry32, shuffle } from "@/game/random"
import { hashString } from "@/support/hashString"
import type { Formula as FormulaType } from "@/game/formulas/formulas"

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
}> = ({ tableau, calculation, difficulty, onComplete }) => {
  const { t } = useTranslation("common")

  // A hieroglyph is OWNED once its fragments are complete — a reusable key that fills every slot of
  // every tableau, never consumed (see keyRequirements.ts / tableauPuzzleState.ts). So the puzzle
  // reads fragment-collection state, not a stock of items.
  const { hieroglyphProgress } = useHieroglyphProgress()
  const owns = (symbolId: string) => {
    const { found, required } = hieroglyphProgress(symbolId)
    return found >= required
  }
  const { scribesEyeLevel } = usePuzzleProgress()
  const scribesEyeSlots = scribesEyeLevel === 3 ? Infinity : scribesEyeLevel

  // Domain state: which tiles are filled, and the placed-count per symbol
  const [state, setState] = useState(createTableauPuzzleState)
  const { filledPositions, symbolCounts } = state

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

  // A tableau's hieroglyphs are a COMPLETION precondition, not an entry gate — you can walk in
  // before collecting them all. If any required hieroglyph is still incomplete, Fez nudges you to
  // go finish collecting it (you can place the ones you do own in the meantime).
  const notEnough = useMemo(
    () => Object.keys(calculation.symbolCounts).some(symbolId => !owns(symbolId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- owns() is derived from hieroglyphProgress
    [calculation.symbolCounts, hieroglyphProgress]
  )

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
    setState(prev => toggleTableauTile(prev, symbolId, position, calculation.symbolCounts, owns(symbolId)))
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
    const currentPlaced = symbolCounts[symbolId] || 0
    const maxNeeded = calculation.symbolCounts[symbolId] || 0

    // Owned hieroglyph with an open slot left → fill the first empty position for this symbol.
    if (owns(symbolId) && currentPlaced < maxNeeded) {
      const emptyPositions = findEmptyPositionsForSymbol(symbolId)
      if (emptyPositions.length > 0) {
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

      // Hieroglyphs are reusable keys — solving a tableau consumes nothing.
      lockTimerRef.current = setTimeout(() => {
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

  const inventoryItems: InventoryStripItem[] = Object.keys(calculation.symbolCounts)
    .sort((a, b) => difficultyCompare(getItemFirstLevel(a), getItemFirstLevel(b)))
    .map(symbolId => {
      const inventoryItem = getInventoryItemById(symbolId)
      const { found, required } = hieroglyphProgress(symbolId)
      return {
        symbolId,
        symbol: inventoryItem?.symbol,
        difficulty: getItemFirstLevel(symbolId) || difficulty,
        owned: found >= required,
        found,
        required,
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
    />
  )
}
