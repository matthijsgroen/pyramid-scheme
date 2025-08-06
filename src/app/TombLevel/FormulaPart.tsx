import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { Formula, Operation } from "@/game/generateRewardCalculation"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import {
  egyptianDeities,
  egyptianProfessions,
  egyptianAnimals,
  egyptianArtifacts,
} from "@/data/inventory"

// Helper function to get operator precedence for parentheses
const getOperatorPrecedence = (operation: Operation): number => {
  switch (operation) {
    case "+":
    case "-":
      return 1
    case "*":
    case "/":
      return 2
    default:
      return 0
  }
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

type FilledTileState = {
  symbolCounts: Record<string, number>
  filledPositions: Record<string, number>
}

type FormulaPartProps = {
  formula: Formula
  difficulty: Difficulty
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  onTileClick: (symbolId: string, position: string) => void
  positionPrefix: string
  parentPrecedence?: number
}

const renderTile = (
  symbolMapping: Record<number, string>,
  filledState: FilledTileState,
  onTileClick: (symbolId: string, position: string) => void,
  difficulty: Difficulty,
  operand: number,
  position: string
) => {
  const symbolId = symbolMapping[operand]
  const isFilled = filledState.filledPositions[position] > 0
  const inventoryItem = getInventoryItemById(symbolId)
  const itemDifficulty = getItemFirstLevel(symbolId) || difficulty

  return (
    <HieroglyphTile
      empty={!isFilled}
      symbol={isFilled && inventoryItem ? inventoryItem.symbol : undefined}
      difficulty={itemDifficulty}
      size="sm"
      className="inline-block cursor-pointer align-middle"
      onClick={() => onTileClick(symbolId, position)}
    />
  )
}

const renderOperand = (
  operand: number | Formula,
  side: "left" | "right",
  props: FormulaPartProps,
  currentPrecedence: number
) => {
  const {
    symbolMapping,
    filledState,
    onTileClick,
    difficulty,
    positionPrefix,
    formula,
  } = props

  const position = `${positionPrefix}-${side}`

  if (typeof operand === "number") {
    return renderTile(
      symbolMapping,
      filledState,
      onTileClick,
      difficulty,
      operand,
      position
    )
  }

  // For subtraction, wrap complex operands in parentheses
  const needsSubtractionParens = formula.operation === "-"
  const content = (
    <FormulaPart
      {...props}
      formula={operand}
      positionPrefix={position}
      parentPrecedence={currentPrecedence}
    />
  )

  return needsSubtractionParens ? <span>({content})</span> : content
}

export const FormulaPart: FC<FormulaPartProps> = (props) => {
  const { formula, parentPrecedence = 0 } = props

  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence

  const formulaContent = (
    <>
      {renderOperand(formula.left, "left", props, currentPrecedence)}
      <span> {formula.operation} </span>
      {renderOperand(formula.right, "right", props, currentPrecedence)}
    </>
  )

  return (
    <span>
      {needsParentheses ? <span>({formulaContent})</span> : formulaContent}
    </span>
  )
}

export type { FilledTileState, FormulaPartProps }
