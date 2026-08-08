import type { FC } from "react"
import { HieroglyphTile } from "./HieroglyphTile"
import type { HieroglyphSymbolResolver } from "@/data/resolveHieroglyphSymbol"
import type { Formula, Operation } from "@/game/formulas/formulas"
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

export type FilledTileState = {
  symbolCounts: Record<string, number>
  filledPositions: Record<string, number>
}

type FormulaPartProps = {
  formula: Formula
  showResult: boolean
  obfuscateResult: boolean
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  resolveTile: HieroglyphSymbolResolver
  onTileClick?: (symbolId: string, position: string) => void
  positionPrefix: string
  parentPrecedence?: number
}

const renderTile = (
  symbolMapping: Record<number, string>,
  filledState: FilledTileState,
  resolveTile: HieroglyphSymbolResolver,
  operand: { symbol: number },
  position: string,
  onTileClick?: (symbolId: string, position: string) => void
) => {
  const symbolId = symbolMapping[operand.symbol]

  const isFilled = filledState.filledPositions[position] > 0
  const { symbol, difficulty, fragmentProgress } = resolveTile(symbolId)

  // An empty slot means two very different things: a hieroglyph you own and can drop in right now,
  // or one you are still collecting fragments for. The second gets the stone carved as far as its
  // fragments reach, plus the count — so a blocked slot never looks like an open socket.
  if (!isFilled && symbol && fragmentProgress && fragmentProgress.found < fragmentProgress.required) {
    const { found, required } = fragmentProgress
    return (
      <span className="relative inline-block cursor-not-allowed align-middle" title={`${found}/${required}`}>
        <HieroglyphTile symbol={symbol} difficulty={difficulty} size="sm" fragmentProgress={fragmentProgress} />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/75 px-1 text-[10px] leading-tight font-bold text-white tabular-nums">
          {found}/{required}
        </span>
      </span>
    )
  }

  return (
    <HieroglyphTile
      empty={!isFilled}
      symbol={isFilled ? symbol : undefined}
      difficulty={difficulty}
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
  const { symbolMapping, filledState, resolveTile, onTileClick, positionPrefix } = props

  const position = `${positionPrefix}-${side}`
  if (typeof operand === "number") {
    return <span>{operand}</span>
  }

  if ("symbol" in operand) {
    return renderTile(symbolMapping, filledState, resolveTile, operand, position, onTileClick)
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
