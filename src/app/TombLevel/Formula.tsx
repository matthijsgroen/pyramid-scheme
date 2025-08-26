import type { Difficulty } from "@/data/difficultyLevels"
import type { FC } from "react"
import { FormulaPart, type FilledTileState } from "./FormulaPart"
import { revealText } from "@/support/revealText"
import type { Formula as FormulaType } from "@/game/formulas"

export const Formula: FC<{
  formula: FormulaType
  showResult: boolean
  difficulty: Difficulty
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  onTileClick?: (symbolId: string, position: string) => void
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
