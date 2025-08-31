import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { egyptianDeities, egyptianProfessions, egyptianAnimals, egyptianArtifacts } from "@/data/inventory"
import type { Formula, Operation } from "@/app/Formulas/formulas"
import { revealText } from "@/support/revealText"

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
  const allItems = [...egyptianDeities, ...egyptianProfessions, ...egyptianAnimals, ...egyptianArtifacts]
  return allItems.find(item => item.id === id)
}

export type FilledTileState = {
  symbolCounts: Record<string, number>
  filledPositions: Record<string, number>
}

type FormulaPartProps = {
  formula: Formula
  showResult: boolean
  obfuscateResult: boolean
  difficulty: Difficulty
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  onTileClick?: (symbolId: string, position: string) => void
  positionPrefix: string
  parentPrecedence?: number
}

const renderTile = (
  symbolMapping: Record<number, string>,
  filledState: FilledTileState,
  difficulty: Difficulty,
  operand: { symbol: number },
  position: string,
  onTileClick?: (symbolId: string, position: string) => void
) => {
  const symbolId = symbolMapping[operand.symbol]

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
      onClick={() => onTileClick?.(symbolId, position)}
    />
  )
}

const renderOperand = (
  operand: number | Formula | { symbol: number },
  side: "left" | "right" | "result",
  props: FormulaPartProps,
  currentPrecedence = 0
) => {
  const { symbolMapping, filledState, onTileClick, difficulty, positionPrefix, formula } = props

  const position = `${positionPrefix}-${side}`
  if (typeof operand === "number") {
    return <span>{operand}</span>
  }

  if ("symbol" in operand) {
    return renderTile(symbolMapping, filledState, difficulty, operand, position, onTileClick)
  }

  return <FormulaPart {...props} formula={operand} positionPrefix={position} parentPrecedence={currentPrecedence} />
}

const operationMap = {
  "+": "+",
  "-": "-",
  "*": "⨉",
  "/": "÷",
}

export const FormulaPart: FC<FormulaPartProps> = props => {
  const { formula, parentPrecedence = 0, showResult = false } = props

  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence
  const needsParenthesesRight =
    formula.operation === "-" && typeof formula.right !== "number" && !("symbol" in formula.right)

  const formulaContent = (
    <>
      {renderOperand(formula.left, "left", { ...props, showResult: false }, currentPrecedence)}
      <span> {operationMap[formula.operation]} </span>
      {needsParenthesesRight && "("}
      {renderOperand(formula.right, "right", { ...props, showResult: false }, currentPrecedence)}
      {needsParenthesesRight && ")"}
    </>
  )

  return (
    <span>
      {needsParentheses ? <span>({formulaContent})</span> : formulaContent}
      {showResult && (
        <>
          {" = "}
          {props.obfuscateResult
            ? revealText(formula.result.toString(), 0)
            : renderOperand(formula.result, "result", props)}
        </>
      )}
    </span>
  )
}
